const crypto = require('node:crypto');
const { db } = require('./db');

const COOKIE_NAME = 'sihadir_sid';
const SESSION_DAYS = 7;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function parseCookies(header = '') {
  const cookies = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return cookies;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, expires.toISOString());
  return { token, expires };
}

function destroySession(token) {
  db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
}

function userFromCookieHeader(cookieHeader) {
  const token = parseCookies(cookieHeader)[COOKIE_NAME];
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.role, s.expires_at
    FROM auth_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    destroySession(token);
    return null;
  }
  const { expires_at, ...user } = row;
  return { ...user, token };
}

function setSessionCookie(res, token, expires) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    expires,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** Middleware untuk endpoint API yang butuh login. */
function requireAuth(req, res, next) {
  const user = userFromCookieHeader(req.headers.cookie);
  if (!user) return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu' });
  req.user = user;
  next();
}

/** Middleware untuk halaman dashboard: arahkan ke /login kalau belum login. */
function requirePageAuth(req, res, next) {
  const user = userFromCookieHeader(req.headers.cookie);
  if (!user) return res.redirect('/login');
  req.user = user;
  next();
}

/** Buat akun admin default kalau tabel users masih kosong. */
function ensureDefaultAdmin() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return null;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
    .run(username, hashPassword(password), 'Administrator', 'Pengajar');
  return { username, password };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  userFromCookieHeader,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  requirePageAuth,
  ensureDefaultAdmin,
};
