// lib/db.js
// Database layer — Vercel KV (Upstash Redis, serverless, gratis untuk tier
// kecil, tinggal "Connect Store" dari dashboard Vercel, cocok dengan
// requirement PART 7: murah, ringan, tidak butuh VPS pribadi, jalan lewat
// GitHub -> Vercel deploy).
//
// Semua secret (KV_REST_API_URL / KV_REST_API_TOKEN) datang dari environment
// variables yang di-set otomatis oleh Vercel saat KV store di-link ke
// project — tidak pernah ditulis ke source code (PART 7.2).

let kv = null;
let kvReady = false;

async function getKv() {
  if (kv || kvReady) return kv;
  kvReady = true;
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      kv = null; // belum dikonfigurasi -> fallback mode (PART 7.3)
      return kv;
    }
    const mod = await import('@vercel/kv');
    kv = mod.kv;
  } catch (err) {
    console.error('KV init failed:', err);
    kv = null;
  }
  return kv;
}

async function isConfigured() {
  return Boolean(await getKv());
}

const DOWNLOADS_KEY = 'jakalmc:downloads';       // hash: id -> JSON
const USERS_KEY = 'jakalmc:users';               // hash: username(lower) -> JSON (hashed password + role)
const SESSIONS_KEY_PREFIX = 'jakalmc:session:';  // string per sessionId, TTL
const PRESENCE_KEY_PREFIX = 'jakalmc:presence:'; // string per anon id, TTL
const RAM_KEY = 'jakalmc:sim:ram';

async function listDownloads() {
  const client = await getKv();
  if (!client) return [];
  const all = await client.hgetall(DOWNLOADS_KEY);
  if (!all) return [];
  return Object.values(all).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

async function saveDownload(item) {
  const client = await getKv();
  if (!client) throw new Error('backend_not_configured');
  await client.hset(DOWNLOADS_KEY, { [item.id]: item });
  return item;
}

async function deleteDownload(id) {
  const client = await getKv();
  if (!client) throw new Error('backend_not_configured');
  await client.hdel(DOWNLOADS_KEY, id);
}

async function getUser(username) {
  const client = await getKv();
  if (!client) return null;
  return (await client.hget(USERS_KEY, username.toLowerCase())) || null;
}

async function seedUsersIfEmpty(seedFn) {
  const client = await getKv();
  if (!client) return;
  const existing = await client.hgetall(USERS_KEY);
  if (existing && Object.keys(existing).length) return;
  const users = await seedFn();
  for (const u of users) {
    await client.hset(USERS_KEY, { [u.username.toLowerCase()]: u });
  }
}

async function setSession(sessionId, payload, ttlSeconds) {
  const client = await getKv();
  if (!client) return;
  await client.set(SESSIONS_KEY_PREFIX + sessionId, payload, { ex: ttlSeconds });
}

async function getSession(sessionId) {
  const client = await getKv();
  if (!client) return null;
  return (await client.get(SESSIONS_KEY_PREFIX + sessionId)) || null;
}

async function deleteSession(sessionId) {
  const client = await getKv();
  if (!client) return;
  await client.del(SESSIONS_KEY_PREFIX + sessionId);
}

async function heartbeat(anonId, ttlSeconds) {
  const client = await getKv();
  if (!client) return;
  await client.set(PRESENCE_KEY_PREFIX + anonId, Date.now(), { ex: ttlSeconds });
}

async function countOnline() {
  const client = await getKv();
  if (!client) return null;
  let cursor = 0;
  let count = 0;
  do {
    const res = await client.scan(cursor, { match: PRESENCE_KEY_PREFIX + '*', count: 100 });
    cursor = Number(res[0]);
    count += res[1].length;
  } while (cursor !== 0);
  return count;
}

async function nextSimulatedRam() {
  const client = await getKv();
  if (!client) return 42.1;
  let val = await client.get(RAM_KEY);
  if (typeof val !== 'number') val = 42.1;
  val = Math.min(val + 0.01, 48);
  await client.set(RAM_KEY, val);
  return val;
}

module.exports = {
  isConfigured,
  listDownloads,
  saveDownload,
  deleteDownload,
  getUser,
  seedUsersIfEmpty,
  setSession,
  getSession,
  deleteSession,
  heartbeat,
  countOnline,
  nextSimulatedRam
};
