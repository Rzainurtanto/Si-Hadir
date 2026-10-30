const { db, transaction } = require('./db');

function getActiveSession() {
  return db.prepare("SELECT * FROM sesi_kuliah WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1").get() || null;
}

function getLatestSession() {
  return db.prepare('SELECT * FROM sesi_kuliah ORDER BY waktu_mulai DESC, id DESC LIMIT 1').get() || null;
}

function logTap(sesiId, card, hasil, pesan, waktu) {
  const info = db.prepare(`
    INSERT INTO tap_log (sesi_id, uid, nrp, nama, kelas, hasil, pesan, waktu)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sesiId, card.uid || null, card.nrp || null, card.nama || null, card.kelas || null, hasil, pesan, waktu);
  return {
    id: Number(info.lastInsertRowid),
    sesi_id: sesiId,
    uid: card.uid || null,
    nrp: card.nrp || null,
    nama: card.nama || null,
    kelas: card.kelas || null,
    hasil,
    pesan,
    waktu,
  };
}

/**
 * Proses satu tap kartu dari ESP8266.
 * Mengembalikan { body, event, feedItem }: body dikirim ke perangkat,
 * event + feedItem disiarkan ke dashboard lewat Socket.io (event null = tidak disiarkan).
 */
function processTap(input) {
  const card = {
    uid: String(input.uid ?? '').trim().toUpperCase(),
    nrp: String(input.nrp ?? '').trim(),
    nama: String(input.nama ?? '').trim(),
    kelas: String(input.kelas ?? '').trim(),
  };
  const now = new Date().toISOString();

  if (!card.uid && !card.nrp) {
    return {
      body: { success: false, status: 'INVALID', code: 400, message: 'Data Kartu Tidak Lengkap' },
      event: null,
    };
  }

  return transaction(() => {
    const sesi = getActiveSession();
    if (!sesi) {
      return {
        body: { success: false, status: 'NO_SESSION', code: 400, message: 'Tidak Ada Sesi Perkuliahan Aktif' },
        event: null,
      };
    }

    // UID kartu adalah identitas utama (tidak bisa diubah), NRP dari NDEF jadi cadangan.
    let mhs = card.uid ? db.prepare('SELECT * FROM mahasiswa WHERE uid_rfid = ?').get(card.uid) : null;
    let deniedMessage = 'Akses Ditolak: Mahasiswa Belum Terdaftar';
    if (!mhs && card.nrp) {
      const byNrp = db.prepare('SELECT * FROM mahasiswa WHERE nrp = ?').get(card.nrp);
      if (byNrp && !byNrp.uid_rfid) {
        // Mahasiswa terdaftar tanpa UID: ikat UID kartu ini ke datanya.
        if (card.uid) db.prepare('UPDATE mahasiswa SET uid_rfid = ? WHERE id = ?').run(card.uid, byNrp.id);
        mhs = { ...byNrp, uid_rfid: card.uid || null };
      } else if (byNrp) {
        deniedMessage = 'Akses Ditolak: Kartu Tidak Cocok Dengan Data Mahasiswa';
      }
    }

    if (!mhs) {
      const feedItem = logTap(sesi.id, card, 'DITOLAK', deniedMessage, now);
      return {
        body: { success: false, status: 'DENIED', code: 403, message: deniedMessage },
        event: 'TAP_REJECTED',
        feedItem,
      };
    }

    const identity = { uid: card.uid || mhs.uid_rfid, nrp: mhs.nrp, nama: mhs.nama, kelas: mhs.kelas };

    const existing = db.prepare('SELECT id FROM presensi WHERE sesi_id = ? AND mahasiswa_id = ?').get(sesi.id, mhs.id);
    if (existing) {
      const message = 'Peringatan: Anda Sudah Melakukan Absen Pada Sesi Ini';
      const feedItem = logTap(sesi.id, identity, 'SUDAH_ABSEN', message, now);
      return {
        body: { success: false, status: 'ALREADY_TAPPED', code: 409, message },
        event: 'TAP_ALREADY',
        feedItem,
      };
    }

    const batas = new Date(sesi.waktu_mulai).getTime() + sesi.toleransi_menit * 60 * 1000;
    const status = Date.parse(now) <= batas ? 'HADIR' : 'TERLAMBAT';

    db.prepare(`
      INSERT INTO presensi (sesi_id, mahasiswa_id, nrp, nama, kelas, status_kehadiran, waktu_tap)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sesi.id, mhs.id, mhs.nrp, mhs.nama, mhs.kelas, status, now);

    const feedItem = logTap(sesi.id, identity, status, 'Presensi Berhasil', now);
    return {
      body: {
        success: true,
        status: 'ACCEPTED',
        code: 200,
        message: 'Presensi Berhasil',
        data: { nama: mhs.nama, nrp: mhs.nrp, kelas: mhs.kelas, timestamp: now, status_presensi: status },
      },
      event: 'ATTENDANCE_SUCCESS',
      feedItem,
    };
  });
}

/**
 * Daftar kehadiran satu sesi: semua mahasiswa di kelas sesi tersebut,
 * yang tidak tap dianggap TANPA_KETERANGAN. Mahasiswa kelas lain yang ikut tap tetap ditampilkan.
 */
function rosterForSession(sesi) {
  return db.prepare(`
    SELECT * FROM (
      SELECT m.id AS mahasiswa_id, m.nama, m.nrp, m.kelas,
             COALESCE(p.status_kehadiran, 'TANPA_KETERANGAN') AS status, p.waktu_tap
      FROM mahasiswa m
      LEFT JOIN presensi p ON p.mahasiswa_id = m.id AND p.sesi_id = ?
      WHERE m.kelas = ?
      UNION ALL
      SELECT p.mahasiswa_id, p.nama, p.nrp, p.kelas, p.status_kehadiran, p.waktu_tap
      FROM presensi p
      JOIN mahasiswa m ON m.id = p.mahasiswa_id
      WHERE p.sesi_id = ? AND m.kelas <> ?
    )
    ORDER BY waktu_tap IS NULL, waktu_tap, nama
  `).all(sesi.id, sesi.kelas, sesi.id, sesi.kelas);
}

function sessionCounts(sesi) {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM mahasiswa WHERE kelas = ?').get(sesi.kelas);
  const presensi = db.prepare(`
    SELECT SUM(status_kehadiran = 'HADIR') AS hadir, SUM(status_kehadiran = 'TERLAMBAT') AS terlambat
    FROM presensi WHERE sesi_id = ?
  `).get(sesi.id);
  const ditolak = db.prepare(`
    SELECT SUM(hasil = 'DITOLAK') AS ditolak, SUM(hasil = 'SUDAH_ABSEN') AS duplikat
    FROM tap_log WHERE sesi_id = ?
  `).get(sesi.id);
  const hadir = presensi.hadir || 0;
  const terlambat = presensi.terlambat || 0;
  return {
    total_mahasiswa: total,
    hadir,
    terlambat,
    ditolak: ditolak.ditolak || 0,
    duplikat: ditolak.duplikat || 0,
    total_kehadiran: hadir + terlambat,
  };
}

/** Rata-rata persentase kehadiran dari semua sesi yang pernah dibuka. */
function averageAttendance() {
  const row = db.prepare(`
    SELECT AVG(CASE WHEN kelas_total > 0 THEN MIN(1.0, hadir * 1.0 / kelas_total) END) AS rata
    FROM (
      SELECT s.id,
             (SELECT COUNT(*) FROM mahasiswa m WHERE m.kelas = s.kelas) AS kelas_total,
             (SELECT COUNT(*) FROM presensi p WHERE p.sesi_id = s.id)   AS hadir
      FROM sesi_kuliah s
    )
  `).get();
  return row.rata == null ? null : Math.round(row.rata * 100);
}

function dashboardStats() {
  const active = getActiveSession();
  const sesi = active || getLatestSession();
  return {
    sesi_aktif: active,
    sesi_terakhir: active ? null : sesi,
    ringkasan: sesi ? sessionCounts(sesi) : null,
    rata_rata_kehadiran: averageAttendance(),
  };
}

function feedForSession(sesiId, limit = 50) {
  return db.prepare('SELECT * FROM tap_log WHERE sesi_id = ? ORDER BY id DESC LIMIT ?').all(sesiId, limit);
}

module.exports = {
  getActiveSession,
  getLatestSession,
  processTap,
  rosterForSession,
  sessionCounts,
  dashboardStats,
  feedForSession,
};
