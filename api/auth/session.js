// GET /api/auth/session — dibaca frontend saat load untuk tahu apakah ada
// staff (admin/owner) yang sedang login. Member biasa tidak pernah punya
// session di sini — role member datang dari akun LocalStorage existing.
const { getSessionFromRequest } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) { res.status(200).json({ username: null, role: null }); return; }
    res.status(200).json({ username: session.username, role: session.role });
  } catch (err) {
    res.status(200).json({ username: null, role: null });
  }
};
