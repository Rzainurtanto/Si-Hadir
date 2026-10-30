// Isi database dengan data contoh: npm run seed
const { db, transaction } = require('./db');
const { ensureDefaultAdmin } = require('./auth');

const KELAS = '3 D4 TRM A';

const NAMA = [
  'Rafif Nuha', 'Aditya Pratama', 'Bunga Lestari', 'Cahya Ramadhan', 'Dimas Saputra',
  'Eka Wulandari', 'Fajar Nugroho', 'Gita Permata', 'Hendra Wijaya', 'Indah Puspita',
  'Joko Santoso', 'Kartika Sari', 'Lukman Hakim', 'Maya Anggraini', 'Nanda Kurniawan',
  'Oktavia Putri', 'Putra Mahendra', 'Rina Marlina', 'Satria Wibowo', 'Tiara Ananda',
];

ensureDefaultAdmin();

transaction(() => {
  db.prepare('INSERT OR IGNORE INTO mata_kuliah (kode_mk, nama_mk, kelas) VALUES (?, ?, ?)')
    .run('TRM301', 'Workshop Kecerdasan Buatan', KELAS);
  db.prepare('INSERT OR IGNORE INTO mata_kuliah (kode_mk, nama_mk, kelas) VALUES (?, ?, ?)')
    .run('TRM305', 'Sistem Tertanam', KELAS);

  const insert = db.prepare('INSERT OR IGNORE INTO mahasiswa (nama, nrp, kelas, uid_rfid) VALUES (?, ?, ?, ?)');
  NAMA.forEach((nama, i) => {
    const nrp = `53246000${String(i + 1).padStart(2, '0')}`;
    const uid = `A3${(0x4B22F1 + i * 7919).toString(16).toUpperCase().padStart(6, '0')}`;
    insert.run(nama, nrp, KELAS, uid);
  });
});

const { n } = db.prepare('SELECT COUNT(*) AS n FROM mahasiswa').get();
console.log(`Data contoh siap: ${n} mahasiswa, 2 mata kuliah (kelas ${KELAS}).`);
