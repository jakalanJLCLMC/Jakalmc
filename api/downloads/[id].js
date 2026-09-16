// PUT    /api/downloads/:id — edit download (admin/owner)
// DELETE /api/downloads/:id — hapus download (admin/owner)
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
  const { id } = req.query;

  if (req.method === 'PUT') {
    const session = await requireRole(req, res, ['admin', 'owner']);
    if (!session) return;

    const existingList = await db.listDownloads();
    const existing = existingList.find((d) => d.id === id);
    if (!existing) { res.status(404).json({ error: 'not_found' }); return; }

    const { name, url, category, description, icon, version } = req.body || {};
    const updated = Object.assign({}, existing, {
      name: name ? String(name).slice(0, 80) : existing.name,
      url: url ? String(url).slice(0, 500) : existing.url,
      category: category ? String(category).slice(0, 40) : existing.category,
      description: description !== undefined ? String(description).slice(0, 300) : existing.description,
      version: version !== undefined ? String(version).slice(0, 20) : existing.version,
      icon: icon ? String(icon).slice(0, 4) : existing.icon,
      updatedAt: new Date().toISOString()
    });

    try {
      await db.saveDownload(updated);
      res.status(200).json({ item: toClientItem(updated) });
    } catch (err) {
      res.status(503).json({ error: 'backend_not_configured' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const session = await requireRole(req, res, ['admin', 'owner']);
    if (!session) return;

    try {
      await db.deleteDownload(id);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(503).json({ error: 'backend_not_configured' });
    }
    return;
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
