const os = require('node:os');
const express = require('express');
const { db } = require('./db');
const auth = require('./auth');
const attendance = require('./attendance');
const { todayWIB, isValidDate, dayRangeWIB, formatJamWIB } = require('./time');

const STATUS_LABEL = {
  HADIR: 'Hadir',
  TERLAMBAT: 'Terlambat',
  TANPA_KETERANGAN: 'Tanpa Keterangan',
};

const text = (v) => String(v ?? '').trim();
const fail = (res, code, message) => res.status(code).json({ success: false, message });

function isUniqueError(err) {
  return /UNIQUE constraint failed/.test(err?.message || '');
}

// Batasi percobaan login: 10 kali per 15 menit per IP.
const loginAttempts = new Map();
function loginLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.start > 15 * 60 * 1000) {
    loginAttempts.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * @param {(event: string, payload: any) => void} broadcast  kirim event ke semua dashboard yang terhubung
 */
function createApiRouter(broadcast) {
  const api = express.Router();
  api.use(express.json({ limit: '32kb' }));

  /* ------------------------------------------------------------------ */
  /* Perangkat ESP8266                                                   */
  /* ------------------------------------------------------------------ */

  api.post('/attendance/tap', (req, res) => {
    const deviceKey = process.env.DEVICE_KEY;
    if (deviceKey && req.get('X-Device-Key') !== deviceKey) {
      return res.status(401).json({ success: false, status: 'UNAUTHORIZED', code: 401, message: 'Perangkat Tidak Dikenal' });
    }
    const { body, event, feedItem } = attendance.processTap(req.body || {});
    if (event) {
      broadcast(event, feedItem);
      broadcast('STATS_UPDATE', attendance.dashboardStats());
    }
    // Sesuai alur di spesifikasi: perangkat selalu menerima HTTP 200, status ada di body.
    res.status(body.status === 'INVALID' ? 400 : 200).json(body);
  });

  /* ------------------------------------------------------------------ */
  /* Autentikasi                                                         */
  /* ------------------------------------------------------------------ */

  api.post('/auth/login', (req, res) => {
    if (loginLimited(req.ip)) return fail(res, 429, 'Terlalu banyak percobaan login, coba lagi nanti');
    const username = text(req.body?.username);
    const password = String(req.body?.password ?? '');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !auth.verifyPassword(password, user.password_hash)) {
      return fail(res, 401, 'Username atau password salah');
    }
    loginAttempts.delete(req.ip);
    const { token, expires } = auth.createSession(user.id);
    auth.setSessionCookie(res, token, expires);
    res.json({ success: true, data: { username: user.username, full_name: user.full_name, role: user.role } });
  });

  // Semua endpoint di bawah ini butuh login.
  api.use(auth.requireAuth);

  api.post('/auth/logout', (req, res) => {
    auth.destroySession(req.user.token);
    auth.clearSessionCookie(res);
    res.json({ success: true });
  });

  api.get('/auth/me', (req, res) => {
    const { token, ...user } = req.user;
    res.json({ success: true, data: user });
  });

  api.put('/auth/profile', (req, res) => {
    const fullName = text(req.body?.full_name);
    const role = text(req.body?.role);
    const passwordLama = String(req.body?.password_lama ?? '');
    const passwordBaru = String(req.body?.password_baru ?? '');
    if (!fullName) return fail(res, 400, 'Nama lengkap wajib diisi');

    if (passwordBaru) {
      if (passwordBaru.length < 6) return fail(res, 400, 'Password baru minimal 6 karakter');
      const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
      if (!auth.verifyPassword(passwordLama, row.password_hash)) return fail(res, 400, 'Password lama salah');
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(auth.hashPassword(passwordBaru), req.user.id);
    }
    db.prepare('UPDATE users SET full_name = ?, role = ? WHERE id = ?').run(fullName, role || req.user.role, req.user.id);
    res.json({ success: true, data: { username: req.user.username, full_name: fullName, role: role || req.user.role } });
  });

  // Alamat yang bisa dipakai ESP8266 (IP laptop di jaringan lokal, bukan localhost).
  api.get('/system/info', (req, res) => {
    const port = req.socket.localPort;
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .map((i) => `http://${i.address}:${port}/api/attendance/tap`);
    res.json({ success: true, data: { tap_urls: lan, device_key_required: Boolean(process.env.DEVICE_KEY) } });
  });

  /* ------------------------------------------------------------------ */
  /* Dashboard                                                           */
  /* ------------------------------------------------------------------ */

  api.get('/dashboard', (req, res) => {
    res.json({ success: true, data: attendance.dashboardStats() });
  });

  /* ------------------------------------------------------------------ */
  /* Sesi perkuliahan                                                    */
  /* ------------------------------------------------------------------ */

  api.get('/session/active', (req, res) => {
    res.json({ success: true, data: attendance.getActiveSession() });
  });

  api.get('/session/list', (req, res) => {
    const date = text(req.query.date);
    if (date) {
      if (!isValidDate(date)) return fail(res, 400, 'Format tanggal harus YYYY-MM-DD');
      const [from, to] = dayRangeWIB(date);
      const rows = db.prepare(
        'SELECT * FROM sesi_kuliah WHERE waktu_mulai >= ? AND waktu_mulai < ? ORDER BY waktu_mulai DESC',
      ).all(from, to);
      return res.json({ success: true, data: rows });
    }
    res.json({ success: true, data: db.prepare('SELECT * FROM sesi_kuliah ORDER BY waktu_mulai DESC LIMIT 50').all() });
  });

  api.post('/session/start', (req, res) => {
    if (attendance.getActiveSession()) return fail(res, 409, 'Masih ada sesi yang aktif. Tutup dulu sebelum membuka sesi baru');

    const mataKuliahId = Number(req.body?.mata_kuliah_id);
    const toleransi = Number(req.body?.toleransi_menit ?? 15);

    // Nama mata kuliah dan kelas selalu diambil dari data mata kuliah, tidak bisa diisi bebas.
    if (!mataKuliahId) return fail(res, 400, 'Pilih mata kuliah terlebih dahulu');
    const mk = db.prepare('SELECT * FROM mata_kuliah WHERE id = ?').get(mataKuliahId);
    if (!mk) return fail(res, 404, 'Mata kuliah tidak ditemukan');
    const namaMk = mk.nama_mk;
    const kelas = mk.kelas;

    if (!Number.isInteger(toleransi) || toleransi < 0 || toleransi > 240) {
      return fail(res, 400, 'Toleransi harus angka 0 sampai 240 menit');
    }

    const info = db.prepare(`
      INSERT INTO sesi_kuliah (mata_kuliah_id, nama_mk, kelas, waktu_mulai, toleransi_menit, status, dibuka_oleh)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(mataKuliahId, namaMk, kelas, new Date().toISOString(), toleransi, req.user.id);

    const sesi = db.prepare('SELECT * FROM sesi_kuliah WHERE id = ?').get(info.lastInsertRowid);
    broadcast('SESSION_UPDATE', sesi);
    broadcast('STATS_UPDATE', attendance.dashboardStats());
    res.status(201).json({ success: true, data: sesi });
  });

  api.post('/session/close', (req, res) => {
    const sesi = attendance.getActiveSession();
    if (!sesi) return fail(res, 404, 'Tidak ada sesi yang aktif');
    db.prepare("UPDATE sesi_kuliah SET status = 'CLOSED', waktu_selesai = ? WHERE id = ?")
      .run(new Date().toISOString(), sesi.id);
    const closed = db.prepare('SELECT * FROM sesi_kuliah WHERE id = ?').get(sesi.id);
    broadcast('SESSION_UPDATE', closed);
    broadcast('STATS_UPDATE', attendance.dashboardStats());
    res.json({ success: true, data: closed });
  });

  /* ------------------------------------------------------------------ */
  /* Mata kuliah                                                         */
  /* ------------------------------------------------------------------ */

  api.get('/courses', (req, res) => {
    res.json({ success: true, data: db.prepare('SELECT * FROM mata_kuliah ORDER BY nama_mk').all() });
  });

  api.post('/courses', (req, res) => {
    const kode = text(req.body?.kode_mk).toUpperCase();
    const nama = text(req.body?.nama_mk);
    const kelas = text(req.body?.kelas);
    if (!kode || !nama || !kelas) return fail(res, 400, 'Kode, nama mata kuliah, dan kelas wajib diisi');
    try {
      const info = db.prepare('INSERT INTO mata_kuliah (kode_mk, nama_mk, kelas) VALUES (?, ?, ?)').run(kode, nama, kelas);
      res.status(201).json({ success: true, data: db.prepare('SELECT * FROM mata_kuliah WHERE id = ?').get(info.lastInsertRowid) });
    } catch (err) {
      if (isUniqueError(err)) return fail(res, 409, `Kode mata kuliah ${kode} sudah dipakai`);
      throw err;
    }
  });

  api.delete('/courses/:id', (req, res) => {
    const info = db.prepare('DELETE FROM mata_kuliah WHERE id = ?').run(Number(req.params.id));
    if (!info.changes) return fail(res, 404, 'Mata kuliah tidak ditemukan');
    res.json({ success: true });
  });

  /* ------------------------------------------------------------------ */
  /* Data mahasiswa                                                      */
  /* ------------------------------------------------------------------ */

  function readStudent(body) {
    return {
      nama: text(body?.nama),
      nrp: text(body?.nrp),
      kelas: text(body?.kelas),
      uid_rfid: text(body?.uid_rfid).toUpperCase() || null,
    };
  }

  function studentConflict(err, mhs) {
    if (/mahasiswa\.nrp/.test(err.message)) return `NRP ${mhs.nrp} sudah terdaftar`;
    if (/mahasiswa\.uid_rfid/.test(err.message)) return `UID kartu ${mhs.uid_rfid} sudah dipakai mahasiswa lain`;
    return 'Data bentrok dengan mahasiswa lain';
  }

  api.get('/students', (req, res) => {
    const q = text(req.query.q);
    const rows = q
      ? db.prepare(`
          SELECT * FROM mahasiswa
          WHERE nama LIKE ?1 OR nrp LIKE ?1 OR kelas LIKE ?1 OR uid_rfid LIKE ?1
          ORDER BY nama
        `).all(`%${q}%`)
      : db.prepare('SELECT * FROM mahasiswa ORDER BY nama').all();
    res.json({ success: true, data: rows });
  });

  api.post('/students', (req, res) => {
    const mhs = readStudent(req.body);
    if (!mhs.nama || !mhs.nrp || !mhs.kelas) return fail(res, 400, 'Nama, NRP, dan kelas wajib diisi');
    try {
      const info = db.prepare('INSERT INTO mahasiswa (nama, nrp, kelas, uid_rfid) VALUES (?, ?, ?, ?)')
        .run(mhs.nama, mhs.nrp, mhs.kelas, mhs.uid_rfid);
      res.status(201).json({ success: true, data: db.prepare('SELECT * FROM mahasiswa WHERE id = ?').get(info.lastInsertRowid) });
    } catch (err) {
      if (isUniqueError(err)) return fail(res, 409, studentConflict(err, mhs));
      throw err;
    }
  });

  api.put('/students/:id', (req, res) => {
    const id = Number(req.params.id);
    const mhs = readStudent(req.body);
    if (!mhs.nama || !mhs.nrp || !mhs.kelas) return fail(res, 400, 'Nama, NRP, dan kelas wajib diisi');
    try {
      const info = db.prepare('UPDATE mahasiswa SET nama = ?, nrp = ?, kelas = ?, uid_rfid = ? WHERE id = ?')
        .run(mhs.nama, mhs.nrp, mhs.kelas, mhs.uid_rfid, id);
      if (!info.changes) return fail(res, 404, 'Mahasiswa tidak ditemukan');
      res.json({ success: true, data: db.prepare('SELECT * FROM mahasiswa WHERE id = ?').get(id) });
    } catch (err) {
      if (isUniqueError(err)) return fail(res, 409, studentConflict(err, mhs));
      throw err;
    }
  });

  api.delete('/students/:id', (req, res) => {
    const info = db.prepare('DELETE FROM mahasiswa WHERE id = ?').run(Number(req.params.id));
    if (!info.changes) return fail(res, 404, 'Mahasiswa tidak ditemukan');
    broadcast('STATS_UPDATE', attendance.dashboardStats());
    res.json({ success: true });
  });

  /* ------------------------------------------------------------------ */
  /* Presensi                                                            */
  /* ------------------------------------------------------------------ */

  api.get('/attendance/feed', (req, res) => {
    const sesiId = req.query.sesi_id
      ? Number(req.query.sesi_id)
      : (attendance.getActiveSession() || attendance.getLatestSession())?.id;
    res.json({ success: true, data: sesiId ? attendance.feedForSession(sesiId) : [] });
  });

  // Tap kartu terakhir yang ditolak (10 menit terakhir), untuk mengisi form Tambah Mahasiswa.
  api.get('/attendance/last-rejected', (req, res) => {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const row = db.prepare(`
      SELECT t.* FROM tap_log t
      WHERE t.hasil = 'DITOLAK' AND t.waktu >= ? AND t.uid IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM mahasiswa m WHERE m.uid_rfid = t.uid)
      ORDER BY t.id DESC LIMIT 1
    `).get(since);
    res.json({ success: true, data: row || null });
  });

  api.get('/attendance/logs', (req, res) => {
    const sesiId = req.query.sesi_id ? Number(req.query.sesi_id) : null;
    const date = text(req.query.date) || todayWIB();
    const q = text(req.query.q).toLowerCase();
    if (!sesiId && !isValidDate(date)) return fail(res, 400, 'Format tanggal harus YYYY-MM-DD');

    let sessions;
    if (sesiId) {
      const sesi = db.prepare('SELECT * FROM sesi_kuliah WHERE id = ?').get(sesiId);
      if (!sesi) return fail(res, 404, 'Sesi tidak ditemukan');
      sessions = [sesi];
    } else {
      const [from, to] = dayRangeWIB(date);
      sessions = db.prepare(
        'SELECT * FROM sesi_kuliah WHERE waktu_mulai >= ? AND waktu_mulai < ? ORDER BY waktu_mulai',
      ).all(from, to);
    }

    let rows = sessions.flatMap((sesi) =>
      attendance.rosterForSession(sesi).map((r) => ({ ...r, sesi_id: sesi.id, nama_mk: sesi.nama_mk })),
    );
    if (q) {
      rows = rows.filter((r) => [r.nama, r.nrp, r.kelas].some((v) => String(v).toLowerCase().includes(q)));
    }

    if (req.query.format === 'csv') {
      const header = ['Nama', 'NRP', 'Kelas', 'Mata Kuliah', 'Status', 'Waktu'];
      const lines = rows.map((r) =>
        [r.nama, r.nrp, r.kelas, r.nama_mk, STATUS_LABEL[r.status] || r.status, r.waktu_tap ? formatJamWIB(r.waktu_tap) : '-']
          .map(csvCell).join(','),
      );
      const filename = sesiId ? `presensi-sesi-${sesiId}.csv` : `presensi-${date}.csv`;
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
      // BOM supaya Excel membaca UTF-8 dengan benar.
      return res.send('﻿' + [header.join(','), ...lines].join('\r\n'));
    }

    res.json({ success: true, data: rows, sessions });
  });

  api.use((req, res) => fail(res, 404, 'Endpoint tidak ditemukan'));

  return api;
}

module.exports = { createApiRouter };
