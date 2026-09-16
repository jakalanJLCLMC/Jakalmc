// POST /api/auth/logout — invalidate session di server + hapus cookie.
const { destroySession } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  await destroySession(req, res);
  res.status(200).json({ ok: true });
};
