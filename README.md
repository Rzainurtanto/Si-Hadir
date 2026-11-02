# SI-HADIR

Sistem presensi perkuliahan berbasis RFID (ESP8266 + RC522) dengan web dashboard real-time.
Spesifikasi lengkap ada di [Spesifikasi Arsitektur Sistem IoT Absen.md](Spesifikasi%20Arsitektur%20Sistem%20IoT%20Absen.md).

## Menjalankan di Lokal (Development)

Butuh Node.js 24 atau lebih baru (terpasang di `D:\nodejs`).

```bash
npm install        # sekali saja
npm run seed       # opsional: isi 20 mahasiswa & 2 mata kuliah contoh
npm start          # buka http://localhost:3000
```

Saat pertama kali jalan, server membuat akun **admin / admin123**. Ganti password di menu **Pengaturan**.

Untuk mencoba tanpa ESP8266: buka sesi di **Perkuliahan**, lalu pakai **Simulasi Tap Kartu** di menu **Pengaturan**,
atau jalankan `npm run simulate` di terminal lain.

## Menjalankan dengan Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Aplikasi dapat diakses di `http://localhost:3000`. Database SQLite otomatis tersimpan di folder `./data` host machine secara persisten.

---

## Otomatisasi Deployment & CI/CD (GitHub Actions)

Repositori ini sudah dilengkapi alur **CI/CD Otomatis** lewat GitHub Actions (`.github/workflows/deploy.yml`).

Setiap kali ada **push baru ke branch `develop`**, GitHub Actions akan:
1. **CI (Test)**: Menjalankan syntax check dan verifikasi dependensi (`npm test`).
2. **CD (Auto Deploy)**: Menghubungi server tujuan via SSH, membackup database SQLite secara otomatis (`data/backups/`), menarik kode terbaru dari branch `develop`, dan membangun ulang kontainer Docker tanpa menghapus database.

### Setup GitHub Secrets

Agar deployment otomatis berjalan, tambahkan secret berikut di repositori GitHub Anda (**Settings > Secrets and variables > Actions > New repository secret**):

| Secret Name | Keterangan | Contoh Nilai |
|-------------|------------|--------------|
| `SERVER_HOST` | IP Publik atau domain server / VPS | `103.123.45.67` |
| `SERVER_USER` | Username SSH server | `ubuntu` atau `root` |
| `SERVER_SSH_KEY` | Private SSH Key server (id_rsa / id_ed25519) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `SERVER_PORT` | Port SSH server (default: 22) | `22` |
| `SERVER_PATH` | Path direktori instalasi aplikasi di server | `/home/ubuntu/si-hadir` atau `/var/www/si-hadir` |
| `SERVER_PASSWORD` | *(Opsional)* Password SSH jika tidak menggunakan SSH Key | `password_vps` |

### Persistensi & Backup Database di Server

- Database menggunakan SQLite (`data/sihadir.db`) yang dimount langsung ke host `./data:/app/data`.
- Data absensi, mahasiswa, dan akun admin **TIDAK AKAN HILANG** saat kontainer diperbarui atau di-restart.
- Setiap kali proses deploy berjalan, script `deploy.sh` otomatis membuat salinan cadangan di folder `data/backups/sihadir_backup_<timestamp>.db` dan merotasi penyimpanan (menyimpan 10 backup terakhir).

---

## Halaman

| Alamat        | Isi |
|---------------|-----|
| `/`           | Landing page |
| `/login`      | Masuk admin / dosen |
| `/dashboard`  | Sesi aktif, ringkasan presensi, tabel tap kartu live |
| `/mahasiswa`  | Data mahasiswa + UID kartu (tambah, edit, hapus) |
| `/perkuliahan`| Buka/tutup sesi (kelas mengikuti mata kuliah), kelola mata kuliah |
| `/riwayat`    | Riwayat per tanggal / sesi, export CSV |
| `/pengaturan` | Alamat ESP8266, simulator tap kartu, akun |

## Untuk ESP8266

```
POST http://<IP-server>:3000/api/attendance/tap
Content-Type: application/json

{ "uid": "A34B22F1", "nrp": "5324600006", "nama": "Rafif Nuha", "kelas": "3 D4 TRM A" }
```

- Pakai IP server/laptop di jaringan WiFi yang sama atau IP publik VPS. Alamatnya tampil saat `npm start` dan di halaman Pengaturan.
- Sesuai diagram alur di spesifikasi, server selalu membalas **HTTP 200**. Hasilnya dibaca dari field `status`:
  `ACCEPTED`, `DENIED`, `ALREADY_TAPPED`, atau `NO_SESSION`.
- Mahasiswa dicocokkan lewat UID kartu. Kalau UID belum terdaftar tapi NRP-nya cocok dengan mahasiswa yang belum punya UID,
  UID kartu itu otomatis disimpan ke data mahasiswa tersebut.
- Status `HADIR` kalau tap masih dalam batas toleransi sejak sesi dibuka, selebihnya `TERLAMBAT`.

## Pengaturan lewat environment variable

| Variabel         | Default             | Fungsi |
|------------------|---------------------|--------|
| `PORT`           | `3000`              | Port server |
| `DB_PATH`        | `data/sihadir.db`   | Lokasi database SQLite |
| `DEVICE_KEY`     | (kosong)            | Kalau diisi, ESP8266 wajib mengirim header `X-Device-Key` dengan nilai ini |
| `ADMIN_USERNAME` | `admin`             | Username admin pertama |
| `ADMIN_PASSWORD` | `admin123`          | Password admin pertama |
| `COOKIE_SECURE`  | `false`             | Isi `true` kalau server dijalankan di HTTPS |
| `AUTO_SEED`      | `false`             | Isi `true` jika ingin otomatis memasukkan data contoh mahasiswa & matkul saat server pertama kali start |

## Font

- **NType 82**: `public/fonts/NType82-Regular.ttf` (menu, judul, tombol)
- **Doto**: logo titik-titik, dari Google Fonts
- **Lettera Mono LL**: data di tabel. Taruh file-nya (`.woff2`, `.woff`, `.otf`, atau `.ttf`, nama file mengandung "Lettera")
  di `public/fonts/`, server akan memakainya otomatis. Selama belum ada, tabel memakai DM Mono.

## Struktur

```
.github/workflows/deploy.yml   GitHub Actions CI/CD pipeline
Dockerfile                     Konfigurasi container Docker Node.js 24
docker-compose.yml             Docker Compose & volume database persisten
deploy.sh                      Script deployment otomatis & backup database
ecosystem.config.js            Konfigurasi PM2 (opsional non-docker)
server/
  index.js                     server Express + Socket.io, halaman
  api.js                       semua endpoint REST (termasuk /api/health)
  attendance.js                logika tap kartu, rekap sesi
  auth.js                      login, sesi cookie, hash password
  db.js                        skema SQLite (node:sqlite bawaan Node)
  seed.js                      data contoh
  simulate-tap.js              simulasi tap dari terminal
public/
  pages/                       HTML tiap halaman
  css/app.css                  seluruh tampilan
  js/                          script per halaman (app.js = sidebar, topbar, kalender, modal)
data/                          database SQLite & backup (tidak ikut git)
```
