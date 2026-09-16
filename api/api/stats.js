// GET /api/stats — angka dashboard. RAM/CPU jelas ditandai "simulated"
// (PART 9 / PART 29 — honesty rule): ini bukan metric hardware Vercel asli.
const db = require('../lib/db');

module.exports = async function handler(req, res) {
  const configured = await db.isConfigured();

  let onlineUsers = null;
  let downloadLinks = 0;
  let ram = 42.1;

  if (configured) {
    try {
      onlineUsers = await db.countOnline();
      const downloads = await db.listDownloads();
      downloadLinks = downloads.length;
      ram = await db.nextSimulatedRam();
    } catch (err) {
      console.error('stats error:', err);
    }
  }

  const cpu = Number((1 + Math.random() * 0.6).toFixed(1)); // simulated, selalu rendah

  res.status(200).json({
    onlineUsers,
    downloadLinks,
    ram: Number(ram.toFixed(2)),
    ramMode: 'simulated',
    cpu,
    cpuMode: 'simulated',
    backend: configured ? 'online' : 'offline',
    timestamp: new Date().toISOString()
  });
};
