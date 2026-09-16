// lib/auth.js
// Session + password handling. Password TIDAK PERNAH disimpan plaintext
// (di-hash dengan bcrypt), dan session yang disimpan di cookie hanya berupa
// ID acak opaque — data asli (username, role) disimpan server-side di KV
// (PART 2.4, PART 20).

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const SESSION_COOKIE = 'jakalmc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 jam

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function setSessionCookie(res, sessionId) {
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=${sessionId}; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function createSession(res, username, role) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  await db.setSession(sessionId, { username, role, loginAt: new Date().toISOString() }, SESSION_TTL_SECONDS);
  setSessionCookie(res, sessionId);
  return sessionId;
}

async function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) return null;
  const session = await db.getSession(sessionId);
  return session ? Object.assign({ sessionId }, session) : null;
}

async function destroySession(req, res) {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE];
  if (sessionId) await db.deleteSession(sessionId);
  clearSessionCookie(res);
}

// Server-side permission check — never trust a role sent by the client
// (PART 6.7 / PART 2.2 / PART 20). Returns the session on success, or
// writes the error response itself and returns null.
async function requireRole(req, res, allowedRoles) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  if (!allowedRoles.includes(session.role)) {
    res.status(403).json({ error: 'forbidden' });
    return null;
  }
  return session;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionFromRequest,
  destroySession,
  requireRole
};
