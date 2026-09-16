// GET /api/health — dipakai frontend untuk status "🟢 Server Backend: ON"
const db = require('../lib/db');

module.exports = async function handler(req, res) {
  const configured = await db.isConfigured();
  res.status(200).json({
    status: configured ? 'online' : 'offline',
    service: 'jakalmc',
    timestamp: new Date().toISOString()
  });
};
