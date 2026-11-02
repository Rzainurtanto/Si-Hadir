module.exports = {
  apps: [
    {
      name: 'si-hadir',
      script: 'server/index.js',
      instances: 1, // Single instance untuk integritas SQLite WAL mode & WebSocket
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_PATH: 'data/sihadir.db',
      },
    },
  ],
};
