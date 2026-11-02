#!/usr/bin/env bash
set -e

echo "=================================================="
echo " [SI-HADIR] Memulai Deployment Otomatis (Docker)  "
echo "=================================================="

# 1. Pastikan folder data dan backup ada
mkdir -p data/backups

# 2. Backup database SQLite sebelum perubahan diterapkan
if [ -f "data/sihadir.db" ]; then
  TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
  BACKUP_PATH="data/backups/sihadir_backup_${TIMESTAMP}.db"
  echo "-> Membackup database ke: ${BACKUP_PATH}"
  cp data/sihadir.db "${BACKUP_PATH}"
  [ -f data/sihadir.db-wal ] && cp data/sihadir.db-wal "data/backups/sihadir_backup_${TIMESTAMP}.db-wal" || true
  
  # Rotasi backup: simpan 10 backup terakhir, hapus yang lebih lama
  (cd data/backups && ls -t sihadir_backup_*.db 2>/dev/null | tail -n +11 | xargs -r rm -f)
  echo "-> Backup database selesai."
fi

# 3. Pull kode terbaru dari branch develop
echo "-> Menarik update terbaru dari origin/develop..."
git fetch origin develop
git reset --hard origin/develop

# 4. Siapkan file .env jika belum ada
if [ ! -f .env ]; then
  echo "-> Menyiapkan .env dari .env.example..."
  cp .env.example .env
fi

# 5. Jalankan aplikasi menggunakan Docker murni (tanpa butuh docker-compose)
if command -v docker &>/dev/null; then
  echo "-> Membangun Docker image 'sihadir:latest'..."
  docker build -t sihadir:latest .

  echo "-> Menghentikan kontainer lama jika ada..."
  docker stop sihadir_app 2>/dev/null || true
  docker rm sihadir_app 2>/dev/null || true

  # Ambil port dari .env atau default ke 3000
  APP_PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d '=' -f2 | tr -d '\r\n')
  APP_PORT=${APP_PORT:-3000}

  echo "-> Menjalankan kontainer baru 'sihadir_app' pada port ${APP_PORT}..."
  docker run -d \
    --name sihadir_app \
    --restart unless-stopped \
    -p "${APP_PORT}:3000" \
    --env-file .env \
    -v "$(pwd)/data:/app/data" \
    sihadir:latest

  echo "-> Membersihkan cache image lama..."
  docker image prune -f

  echo "-> Menunggu container siap..."
  sleep 4
  if command -v curl &>/dev/null; then
    curl -sSf "http://localhost:${APP_PORT}/api/health" || echo "Peringatan: Silakan cek dengan 'docker ps'"
  fi

elif command -v pm2 &>/dev/null; then
  echo "-> Docker tidak terpasang, beralih ke PM2..."
  npm ci --omit=dev
  pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
  pm2 save
else
  echo "-> Menjalankan npm install..."
  npm ci --omit=dev
  echo "Jalankan 'npm start' secara manual atau gunakan Docker."
fi

echo "=================================================="
echo " [SI-HADIR] Deployment Docker Berhasil Selesai!   "
echo "=================================================="
