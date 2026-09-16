// POST /api/presence — heartbeat anonim untuk hitung Online Users (PART 4.1).
// Tidak mengumpulkan data pribadi: hanya ID acak per-browser (cookie),
// TTL 90 detik, jadi user dianggap offline begitu heartbeat berhenti.
const crypto = require('crypto');
const db = require('../lib/db');

const ANON_COOKIE = 'jakalmc_anon';
const PRESENCE_TTL_SECONDS = 90;

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const cookies = parseCookies(req);
  let anonId = cookies[ANON_COOKIE];
  if (!anonId) {
    anonId = crypto.randomBytes(16).toString('hex');
    res.setHeader('Set-Cookie', `${ANON_COOKIE}=${anonId}; SameSite=Lax; Path=/; Max-Age=31536000`);
  }

  try {
    await db.heartbeat(anonId, PRESENCE_TTL_SECONDS);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(200).json({ ok: false }); // jangan sampai gagal presence bikin UI error
  }
};
