const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'sihadir.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'Pengajar'
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mahasiswa (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nrp        TEXT NOT NULL UNIQUE,
    nama       TEXT NOT NULL,
    kelas      TEXT NOT NULL,
    uid_rfid   TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS mata_kuliah (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_mk TEXT NOT NULL UNIQUE,
    nama_mk TEXT NOT NULL,
    kelas   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sesi_kuliah (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    mata_kuliah_id  INTEGER REFERENCES mata_kuliah(id) ON DELETE SET NULL,
    nama_mk         TEXT NOT NULL,
    kelas           TEXT NOT NULL,
    waktu_mulai     TEXT NOT NULL,
    waktu_selesai   TEXT,
    toleransi_menit INTEGER NOT NULL DEFAULT 15,
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    dibuka_oleh     INTEGER REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS presensi (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    sesi_id          INTEGER NOT NULL REFERENCES sesi_kuliah(id) ON DELETE CASCADE,
    mahasiswa_id     INTEGER NOT NULL REFERENCES mahasiswa(id) ON DELETE CASCADE,
    nrp              TEXT NOT NULL,
    nama             TEXT NOT NULL,
    kelas            TEXT NOT NULL,
    status_kehadiran TEXT NOT NULL CHECK (status_kehadiran IN ('HADIR', 'TERLAMBAT')),
    waktu_tap        TEXT NOT NULL,
    UNIQUE (sesi_id, mahasiswa_id)
  );

  -- Semua tap kartu (termasuk yang ditolak / duplikat) untuk feed live di dashboard.
  CREATE TABLE IF NOT EXISTS tap_log (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    sesi_id INTEGER REFERENCES sesi_kuliah(id) ON DELETE CASCADE,
    uid     TEXT,
    nrp     TEXT,
    nama    TEXT,
    kelas   TEXT,
    hasil   TEXT NOT NULL CHECK (hasil IN ('HADIR', 'TERLAMBAT', 'DITOLAK', 'SUDAH_ABSEN')),
    pesan   TEXT,
    waktu   TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_presensi_sesi ON presensi(sesi_id);
  CREATE INDEX IF NOT EXISTS idx_tap_log_sesi ON tap_log(sesi_id);
  CREATE INDEX IF NOT EXISTS idx_sesi_mulai ON sesi_kuliah(waktu_mulai);
`);

/** Jalankan fn di dalam satu transaksi. */
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, transaction, DB_PATH };
