// Simulasi tap kartu seperti ESP8266, tanpa perangkat keras.
//   npm run simulate                       -> tap mahasiswa acak dari database
//   npm run simulate -- A34B22F1           -> tap dengan UID tertentu
//   npm run simulate -- A34B22F1 5324600099 "Nama Baru" "3 D4 TRM A"
const { db } = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const [uidArg, nrpArg, namaArg, kelasArg] = process.argv.slice(2);

let card;
if (uidArg) {
  const mhs = db.prepare('SELECT * FROM mahasiswa WHERE uid_rfid = ?').get(uidArg.toUpperCase());
  card = {
    uid: uidArg,
    nrp: nrpArg ?? mhs?.nrp ?? '',
    nama: namaArg ?? mhs?.nama ?? '',
    kelas: kelasArg ?? mhs?.kelas ?? '',
  };
} else {
  const mhs = db.prepare('SELECT * FROM mahasiswa WHERE uid_rfid IS NOT NULL ORDER BY RANDOM() LIMIT 1').get();
  if (!mhs) {
    console.error('Belum ada mahasiswa dengan UID kartu. Jalankan "npm run seed" dulu.');
    process.exit(1);
  }
  card = { uid: mhs.uid_rfid, nrp: mhs.nrp, nama: mhs.nama, kelas: mhs.kelas };
}

const headers = { 'Content-Type': 'application/json' };
if (process.env.DEVICE_KEY) headers['X-Device-Key'] = process.env.DEVICE_KEY;

console.log('POST /api/attendance/tap', card);
fetch(`http://localhost:${PORT}/api/attendance/tap`, { method: 'POST', headers, body: JSON.stringify(card) })
  .then(async (res) => console.log(`HTTP ${res.status}`, await res.json()))
  .catch((err) => {
    console.error(`Gagal terhubung ke server di port ${PORT}. Sudah "npm start"?`, err.message);
    process.exit(1);
  });
