// GET  /api/downloads  — list download yang ditambahkan lewat Admin Panel
//                          (item bawaan/lama tetap hidup di index.html,
//                          endpoint ini HANYA untuk item baru — PART 16).
// POST /api/downloads  — tambah download baru. Wajib admin/owner,
//                          divalidasi di server, bukan hanya disembunyikan
//                          di UI (PART 6.7).
const crypto = require('crypto');
const db = require('../../lib/db');
const { requireRole } = require('../../lib/auth');

function toClientItem(raw) {
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category,
    icon: raw.icon || '📦',
    link: raw.url,
    version: raw.version || '',
    meta: raw.version ? `Version ${raw.version}` : 'Ditambahkan oleh Admin',
    desc: raw.description ? [raw.description] : ['Tidak ada deskripsi.']
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const items = (await db.listDownloads()).map(toClientItem);
      res.status(200).json({ items });
    } catch (err) {
      res.status(200).json({ items: [] }); // backend belum siap -> demo mode, jangan error
    }
    return;
  }

  if (req.method === 'POST') {
    const session = await requireRole(req, res, ['admin', 'owner']);
    if (!session) return;

    const { name, url, category, description, icon, version } = req.body || {};
    if (!name || !url || !category) {
      res.status(400).json({ error: 'missing_fields' });
      return;
    }

    const item = {
      id: crypto.randomUUID(),
      name: String(name).slice(0, 80),
      url: String(url).slice(0, 500),
      category: String(category).slice(0, 40),
      description: description ? String(description).slice(0, 300) : '',
      version: version ? String(version).slice(0, 20) : '',
      icon: icon ? String(icon).slice(0, 4) : '📦',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.username
    };

    try {
      await db.saveDownload(item);
      res.status(201).json({ item: toClientItem(item) });
    } catch (err) {
      res.status(503).json({ error: 'backend_not_configured' });
    }
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
