// POST /api/auth/login — { username, password } -> httpOnly session cookie.
// Password admin/owner awal (dari requirement) di-hash sekali di sini saat
// database masih kosong (seed), lalu TIDAK PERNAH lagi ditangani sebagai
// plaintext (PART 2.3 / PART 20).
const db = require('../../lib/db');
const { verifyPassword, hashPassword, createSession } = require('../../lib/auth');

async function seedInitialUsers() {
  return [
    { username: 'KiroXd', role: 'admin', passwordHash: await hashPassword('kiroCoding') },
    { username: 'jakaAleas', role: 'owner', passwordHash: await hashPassword('dev89Aleas') }
  ];
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const configured = await db.isConfigured();
  if (!configured) {
    res.status(503).json({ error: 'backend_not_configured' });
    return;
  }

  const { username, password } = req.body || {};
  if (!username || !password) { res.status(400).json({ error: 'missing_fields' }); return; }

  try {
    await db.seedUsersIfEmpty(seedInitialUsers); // hanya jalan sekali, saat KV masih kosong

    const user = await db.getUser(username);
    if (!user) { res.status(401).json({ error: 'invalid_credentials' }); return; }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) { res.status(401).json({ error: 'invalid_credentials' }); return; }

    await createSession(res, user.username, user.role);
    res.status(200).json({ username: user.username, role: user.role });
  } catch (err) {
    console.error('login error:', err);
    res.status(503).json({ error: 'backend_not_configured' });
  }
};
