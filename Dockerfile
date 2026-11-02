# syntax=docker/dockerfile:1
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/sihadir.db

# Pasang dependency production terlebih dahulu untuk layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Salin seluruh kode aplikasi
COPY . .

# Buat direktori data untuk database SQLite
RUN mkdir -p /app/data

EXPOSE 3000

# Volume untuk persistensi database SQLite
VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
