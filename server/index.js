const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');
const auth = require('./auth');
const { createApiRouter } = require('./api');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.disable('x-powered-by');

// Hanya dashboard yang sudah login yang boleh menerima feed real-time.
io.use((socket, next) => {
  const user = auth.userFromCookieHeader(socket.handshake.headers.cookie);
  if (!user) return next(new Error('unauthorized'));
  socket.data.user = user;
  next();
});

const broadcast = (event, payload) => io.emit(event, payload);

app.use('/api', createApiRouter(broadcast));

/* Halaman */
const page = (name) => (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'pages', `${name}.html`));

app.get('/', page('landing'));
app.get('/login', (req, res, next) => {
  if (auth.userFromCookieHeader(req.headers.cookie)) return res.redirect('/dashboard');
  next();
}, page('login'));

for (const name of ['dashboard', 'mahasiswa', 'riwayat', 'pengaturan']) {
  app.get(`/${name}`, auth.requirePageAuth, page(name));
}

// @font-face untuk Lettera Mono LL, dibuat dari file font yang benar-benar ada di public/fonts.
const FONT_FORMATS = { '.woff2': 'woff2', '.woff': 'woff', '.otf': 'opentype', '.ttf': 'truetype' };
app.get('/css/fonts.css', (req, res) => {
  const dir = path.join(PUBLIC_DIR, 'fonts');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /lettera/i.test(f) && FONT_FORMATS[path.extname(f).toLowerCase()]) : [];

  const faces = new Map();
  for (const file of files) {
    const name = file.toLowerCase();
    const weight = /semibold|demibold/.test(name) ? 600 : /bold/.test(name) ? 700 : /medium/.test(name) ? 500 : /light/.test(name) ? 300 : 400;
    const style = /italic|oblique/.test(name) ? 'italic' : 'normal';
    const key = `${weight}-${style}`;
    if (!faces.has(key)) faces.set(key, { weight, style, srcs: [] });
    faces.get(key).srcs.push(file);
  }

  const order = Object.keys(FONT_FORMATS);
  const css = [...faces.values()].map(({ weight, style, srcs }) => {
    const src = srcs
      .sort((a, b) => order.indexOf(path.extname(a).toLowerCase()) - order.indexOf(path.extname(b).toLowerCase()))
      .map((f) => `url('/fonts/${encodeURIComponent(f)}') format('${FONT_FORMATS[path.extname(f).toLowerCase()]}')`)
      .join(', ');
    return `@font-face { font-family: 'Lettera Mono LL'; font-weight: ${weight}; font-style: ${style}; font-display: swap; src: ${src}; }`;
  }).join('\n');

  res.type('text/css').set('Cache-Control', 'no-cache').send(css || '/* Lettera Mono LL belum ada di public/fonts */');
});

app.use(express.static(PUBLIC_DIR, { index: false }));

app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, 'pages', '404.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan di server' });
  }
  res.status(500).send('Terjadi kesalahan di server');
});

const created = auth.ensureDefaultAdmin();

server.listen(PORT, () => {
  const lanIps = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);

  console.log('\n  SI-HADIR berjalan');
  console.log(`  Dashboard  : http://localhost:${PORT}`);
  for (const ip of lanIps) console.log(`  ESP8266    : POST http://${ip}:${PORT}/api/attendance/tap`);
  if (created) {
    console.log(`\n  Akun admin baru dibuat -> username: ${created.username}  password: ${created.password}`);
    console.log('  Segera ganti password di menu Pengaturan.');
  }
  console.log('');
});
