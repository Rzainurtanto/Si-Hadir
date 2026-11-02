#!/usr/bin/env bash
set -e

echo "=================================================="
echo " [SI-HADIR] Memulai Deployment Otomatis ke Server "
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

# 5. Jalankan aplikasi menggunakan Docker Compose (rekomendasi) atau PM2
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  echo "-> Membangun & menjalankan container via Docker Compose..."
  docker compose up -d --build --remove-orphans
  
  echo "-> Membersihkan image docker lama..."
  docker image prune -f

  echo "-> Menunggu aplikasi siap (healthcheck)..."
  sleep 4
  if command -v curl &>/dev/null; then
    curl -sSf http://localhost:3000/api/health || echo "Peringatan: Cek manual endpoint /api/health"
  fi

elif command -v docker-compose &>/dev/null; then
  echo "-> Membangun & menjalankan container via docker-compose legacy..."
  docker-compose up -d --build --remove-orphans
  docker image prune -f

elif command -v pm2 &>/dev/null; then
  echo "-> Docker tidak terpasang, beralih ke PM2..."
  npm ci --omit=dev
  pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
  pm2 save
else
  echo "-> Menjalankan npm install..."
  npm ci --omit=dev
  echo "Jalankan 'npm start' secara manual atau gunakan systemd/PM2/Docker."
fi

echo "=================================================="
echo " [SI-HADIR] Deployment Berhasil Selesai!          "
echo "=================================================="
