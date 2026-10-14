import express from 'express';
import db from '../database.js';
import { requireAdmin, logActivity } from '../auth.js';

const router = express.Router();

// Apply requireAdmin to ALL endpoints in this router
router.use(requireAdmin);

// ==========================================
// 1. DASHBOARD OVERVIEW STATS
// ==========================================
router.get('/stats', (req, res) => {
  try {
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const publishedProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE status = 'published'").get().count;
    const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
    const totalSlides = db.prepare('SELECT COUNT(*) as count FROM hero_slides').get().count;
    const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
    const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
    const totalGallery = db.prepare('SELECT COUNT(*) as count FROM gallery').get().count;

    const recentActivity = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 8').all();
    const lastProductUpdate = db.prepare('SELECT updated_at FROM products ORDER BY updated_at DESC LIMIT 1').get();

    return res.json({
      success: true,
      data: {
        totalProducts,
        publishedProducts,
        totalCategories,
        totalSlides,
        totalEvents,
        totalDocuments,
        totalGallery,
        lastUpdated: lastProductUpdate?.updated_at || new Date().toISOString(),
        recentActivity
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. HERO SLIDES CRUD
// ==========================================
router.get('/hero', (req, res) => {
  const slides = db.prepare('SELECT * FROM hero_slides ORDER BY display_order ASC, id ASC').all();
  return res.json({ success: true, data: slides });
});

router.post('/hero', (req, res) => {
  const { title, subtitle, tag, highlight, description, image, button_text, button_link, display_order, status } = req.body;
  if (!title || !image) {
    return res.status(400).json({ success: false, error: 'Title and image are required' });
  }

  const result = db.prepare(`
    INSERT INTO hero_slides (title, subtitle, tag, highlight, description, image, button_text, button_link, display_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, subtitle || '', tag || '', highlight || '', description || '',
    image, button_text || 'Explore Collections', button_link || '/products',
    Number(display_order) || 0, status || 'published'
  );

  logActivity(req.admin.email, 'CREATE_HERO_SLIDE', `Created hero slide: ${title}`, req);
  return res.json({ success: true, data: { id: result.lastInsertRowid } });
});

router.put('/hero/:id', (req, res) => {
  const { id } = req.params;
  const { title, subtitle, tag, highlight, description, image, button_text, button_link, display_order, status } = req.body;

  db.prepare(`
    UPDATE hero_slides 
    SET title = ?, subtitle = ?, tag = ?, highlight = ?, description = ?, image = ?,
        button_text = ?, button_link = ?, display_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title, subtitle, tag, highlight, description, image,
    button_text, button_link, Number(display_order) || 0, status || 'published', id
  );

  logActivity(req.admin.email, 'UPDATE_HERO_SLIDE', `Updated hero slide ID: ${id}`, req);
  return res.json({ success: true, message: 'Hero slide updated successfully' });
});

router.delete('/hero/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM hero_slides WHERE id = ?').run(id);
  logActivity(req.admin.email, 'DELETE_HERO_SLIDE', `Deleted hero slide ID: ${id}`, req);
  return res.json({ success: true, message: 'Hero slide deleted' });
});

// ==========================================
// 3. PAGES CRUD (Home, About, Finishes, Contact, etc.)
// ==========================================
router.get('/pages/:slug', (req, res) => {
  const { slug } = req.params;
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
  if (page && page.content) {
    try { page.content = JSON.parse(page.content); } catch (e) { }
  }
  return res.json({ success: true, data: page || null });
});

router.put('/pages/:slug', (req, res) => {
  const { slug } = req.params;
  const { title, h1, tagline, content, status } = req.body;

  const existing = db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug) || {};
  const newTitle = title !== undefined ? title : (existing.title || '');
  const newH1 = h1 !== undefined ? h1 : (existing.h1 || '');
  const newTagline = tagline !== undefined ? tagline : (existing.tagline || '');
  const newContent = content !== undefined
    ? (typeof content === 'object' ? JSON.stringify(content) : content)
    : (existing.content || '{}');
  const newStatus = status !== undefined ? status : (existing.status || 'published');

  db.prepare(`
    INSERT INTO pages (slug, title, h1, tagline, content, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      h1 = excluded.h1,
      tagline = excluded.tagline,
      content = excluded.content,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).run(slug, newTitle, newH1, newTagline, newContent, newStatus);

  logActivity(req.admin.email, 'UPDATE_PAGE', `Updated page content for: ${slug}`, req);
  return res.json({ success: true, message: `Page ${slug} updated successfully` });
});

// Backward compatibility alias for /about
router.get('/about', (req, res) => {
  const page = db.prepare("SELECT * FROM pages WHERE slug = 'about'").get();
  if (page && page.content) {
    try { page.content = JSON.parse(page.content); } catch (e) { }
  }
  return res.json({ success: true, data: page });
});

router.put('/about', (req, res) => {
  const { title, h1, tagline, content, status } = req.body;

  const existing = db.prepare("SELECT * FROM pages WHERE slug = 'about'").get() || {};
  const newTitle = title !== undefined ? title : (existing.title || '');
  const newH1 = h1 !== undefined ? h1 : (existing.h1 || '');
  const newTagline = tagline !== undefined ? tagline : (existing.tagline || '');
  const newContent = content !== undefined
    ? (typeof content === 'object' ? JSON.stringify(content) : content)
    : (existing.content || '{}');
  const newStatus = status !== undefined ? status : (existing.status || 'published');

  db.prepare(`
    INSERT INTO pages (slug, title, h1, tagline, content, status, updated_at)
    VALUES ('about', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      h1 = excluded.h1,
      tagline = excluded.tagline,
      content = excluded.content,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).run(newTitle, newH1, newTagline, newContent, newStatus);

  logActivity(req.admin.email, 'UPDATE_ABOUT_PAGE', 'Updated About Us page content', req);
  return res.json({ success: true, message: 'About Us page updated successfully' });
});

// ==========================================
// 4. PRODUCTS CRUD
// ==========================================
router.get('/products', (req, res) => {
  const { search, category, status } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    sql += ' AND (category_name = ? OR category_id = ?)';
    params.push(category, category);
  }
  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR short_description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY display_order ASC, id ASC';

  const rows = db.prepare(sql).all(...params).map(p => ({
    ...p,
    additional_images: p.additional_images ? JSON.parse(p.additional_images) : [],
    specifications: p.specifications ? JSON.parse(p.specifications) : {},
    finishes: p.finishes ? JSON.parse(p.finishes) : []
  }));

  return res.json({ success: true, data: rows });
});

router.post('/products', (req, res) => {
  const {
    name, category_id, category_name, short_description, full_description,
    main_image, additional_images, specifications, finishes, color,
    is_featured, display_order, status
  } = req.body;

  if (!name || !main_image || !category_name) {
    return res.status(400).json({ success: false, error: 'Product name, category, and main image are required' });
  }

  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = `${slugBase}-${Date.now().toString().slice(-4)}`;

  const result = db.prepare(`
    INSERT INTO products (
      slug, name, category_id, category_name, short_description, full_description,
      main_image, additional_images, specifications, finishes, color,
      is_featured, display_order, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug,
    name,
    category_id ? Number(category_id) : 1,
    category_name,
    short_description || '',
    full_description || '',
    main_image,
    JSON.stringify(Array.isArray(additional_images) ? additional_images : []),
    JSON.stringify(typeof specifications === 'object' ? specifications : {}),
    JSON.stringify(Array.isArray(finishes) ? finishes : ['Polish', 'Flamed', 'Honed']),
    color || '',
    is_featured ? 1 : 0,
    Number(display_order) || 0,
    status || 'published'
  );

  logActivity(req.admin.email, 'CREATE_PRODUCT', `Created product: ${name}`, req);
  return res.json({ success: true, data: { id: result.lastInsertRowid, slug } });
});

router.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const {
    name, category_id, category_name, short_description, full_description,
    main_image, additional_images, specifications, finishes, color,
    is_featured, display_order, status
  } = req.body;

  db.prepare(`
    UPDATE products 
    SET name = ?, category_id = ?, category_name = ?, short_description = ?, full_description = ?,
        main_image = ?, additional_images = ?, specifications = ?, finishes = ?, color = ?,
        is_featured = ?, display_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name,
    category_id ? Number(category_id) : 1,
    category_name,
    short_description,
    full_description,
    main_image,
    JSON.stringify(Array.isArray(additional_images) ? additional_images : []),
    JSON.stringify(typeof specifications === 'object' ? specifications : {}),
    JSON.stringify(Array.isArray(finishes) ? finishes : ['Polish', 'Flamed', 'Honed']),
    color,
    is_featured ? 1 : 0,
    Number(display_order) || 0,
    status || 'published',
    id
  );

  logActivity(req.admin.email, 'UPDATE_PRODUCT', `Updated product: ${name} (ID: ${id})`, req);
  return res.json({ success: true, message: 'Product updated successfully' });
});

router.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  const prod = db.prepare('SELECT name FROM products WHERE id = ?').get(id);
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  logActivity(req.admin.email, 'DELETE_PRODUCT', `Deleted product: ${prod?.name || id}`, req);
  return res.json({ success: true, message: 'Product deleted successfully' });
});

// ==========================================
// 5. CATEGORIES CRUD
// ==========================================
router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY display_order ASC, id ASC').all();
  return res.json({ success: true, data: rows });
});

router.post('/categories', (req, res) => {
  const { name, catalog_category, description, image, display_order, status } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Category name is required' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const result = db.prepare(`
    INSERT INTO categories (slug, name, catalog_category, description, image, display_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(slug, name, catalog_category || name, description || '', image || '', Number(display_order) || 0, status || 'published');

  logActivity(req.admin.email, 'CREATE_CATEGORY', `Created category: ${name}`, req);
  return res.json({ success: true, data: { id: result.lastInsertRowid, slug } });
});

router.put('/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, catalog_category, description, image, display_order, status } = req.body;

  db.prepare(`
    UPDATE categories 
    SET name = ?, catalog_category = ?, description = ?, image = ?, 
        display_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, catalog_category || name, description, image, Number(display_order) || 0, status || 'published', id);

  logActivity(req.admin.email, 'UPDATE_CATEGORY', `Updated category ID: ${id}`, req);
  return res.json({ success: true, message: 'Category updated successfully' });
});

router.delete('/categories/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  logActivity(req.admin.email, 'DELETE_CATEGORY', `Deleted category ID: ${id}`, req);
  return res.json({ success: true, message: 'Category deleted' });
});

// ==========================================
// 6. GALLERY CRUD
// ==========================================
router.get('/gallery', (req, res) => {
  const rows = db.prepare('SELECT * FROM gallery ORDER BY display_order ASC, id DESC').all();
  return res.json({ success: true, data: rows });
});

router.post('/gallery', (req, res) => {
  const { title, alt_text, category, image_url, display_order, status } = req.body;
  if (!title || !image_url) return res.status(400).json({ success: false, error: 'Title and image are required' });

  const result = db.prepare(`
    INSERT INTO gallery (title, alt_text, category, image_url, display_order, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, alt_text || title, category || 'General', image_url, Number(display_order) || 0, status || 'published');

  logActivity(req.admin.email, 'CREATE_GALLERY_IMAGE', `Added gallery image: ${title}`, req);
  return res.json({ success: true, data: { id: result.lastInsertRowid } });
});

router.put('/gallery/:id', (req, res) => {
  const { id } = req.params;
  const { title, alt_text, category, image_url, display_order, status } = req.body;
  if (!title || !image_url) {
    return res.status(400).json({ success: false, error: 'Title and image are required' });
  }

  db.prepare(`
    UPDATE gallery 
    SET title = ?, alt_text = ?, category = ?, image_url = ?, 
        display_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, alt_text || title, category || 'General', image_url, Number(display_order) || 0, status || 'published', id);

  logActivity(req.admin.email, 'UPDATE_GALLERY_IMAGE', `Updated gallery item ID: ${id}`, req);
  return res.json({ success: true, message: 'Gallery item updated' });
});

router.delete('/gallery/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
  logActivity(req.admin.email, 'DELETE_GALLERY_IMAGE', `Deleted gallery item ID: ${id}`, req);
  return res.json({ success: true, message: 'Gallery image deleted' });
});

// ==========================================
// 7. DOCUMENTS CRUD
// ==========================================
router.get('/documents', (req, res) => {
  const rows = db.prepare('SELECT * FROM documents ORDER BY display_order ASC, id ASC').all();
  return res.json({ success: true, data: rows });
});

router.post('/documents', (req, res) => {
  const { title, description, file_url, file_type, file_size, status, display_order } = req.body;
  if (!title || !file_url) return res.status(400).json({ success: false, error: 'Document title and file URL are required' });

  const result = db.prepare(`
    INSERT INTO documents (title, description, file_url, file_type, file_size, status, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', file_url, file_type || 'PDF', Number(file_size) || 0, status || 'published', Number(display_order) || 0);

  logActivity(req.admin.email, 'CREATE_DOCUMENT', `Uploaded document: ${title}`, req);
  return res.json({ success: true, data: { id: result.lastInsertRowid } });
});

router.put('/documents/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, file_url, file_type, file_size, status, display_order } = req.body;

  db.prepare(`
    UPDATE documents 
    SET title = ?, description = ?, file_url = ?, file_type = ?, 
        file_size = ?, status = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, file_url, file_type || 'PDF', Number(file_size) || 0, status || 'published', Number(display_order) || 0, id);

  logActivity(req.admin.email, 'UPDATE_DOCUMENT', `Updated document ID: ${id}`, req);
  return res.json({ success: true, message: 'Document updated successfully' });
});

router.delete('/documents/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  logActivity(req.admin.email, 'DELETE_DOCUMENT', `Deleted document ID: ${id}`, req);
  return res.json({ success: true, message: 'Document deleted successfully' });
});

// ==========================================
// 8. EVENTS CRUD
// ==========================================
router.get('/events', (req, res) => {
  const rows = db.prepare('SELECT * FROM events ORDER BY display_order ASC, id DESC').all();
  return res.json({ success: true, data: rows });
});

router.post('/events', (req, res) => {
  const { title, description, date, event_date, location, image, image_url, external_link, display_order, status } = req.body;
  const finalDate = date || event_date;
  const finalImage = image || image_url || '';
  if (!title || !finalDate) return res.status(400).json({ success: false, error: 'Event title and date are required' });

  const result = db.prepare(`
    INSERT INTO events (title, description, date, location, image, external_link, display_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', finalDate, location || '', finalImage, external_link || '', Number(display_order) || 0, status || 'published');

  logActivity(req.admin.email, 'CREATE_EVENT', `Created event: ${title}`, req);
  return res.json({ success: true, data: { id: result.lastInsertRowid } });
});

router.put('/events/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, date, event_date, location, image, image_url, external_link, display_order, status } = req.body;
  const finalDate = date || event_date;
  const finalImage = image || image_url || '';

  db.prepare(`
    UPDATE events 
    SET title = ?, description = ?, date = ?, location = ?, 
        image = ?, external_link = ?, display_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, finalDate, location, finalImage, external_link, Number(display_order) || 0, status || 'published', id);

  logActivity(req.admin.email, 'UPDATE_EVENT', `Updated event ID: ${id}`, req);
  return res.json({ success: true, message: 'Event updated successfully' });
});

router.delete('/events/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  logActivity(req.admin.email, 'DELETE_EVENT', `Deleted event ID: ${id}`, req);
  return res.json({ success: true, message: 'Event deleted' });
});

// ==========================================
// 9. SITE SETTINGS & CONTACT
// ==========================================
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return res.json({ success: true, data: settings });
});

router.put('/settings', (req, res) => {
  const updates = req.body; // { key: value, ... }
  if (typeof updates !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid settings format' });
  }

  const upsert = db.prepare(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  const runUpdates = db.transaction(() => {
    Object.entries(updates).forEach(([key, val]) => {
      upsert.run(key, String(val));
    });
  });

  runUpdates();
  logActivity(req.admin.email, 'UPDATE_SETTINGS', 'Updated website site settings and contact info', req);
  return res.json({ success: true, message: 'Settings saved successfully' });
});

// ==========================================
// 10. SOCIAL MEDIA LINKS CRUD
// ==========================================
router.get('/social', (req, res) => {
  const rows = db.prepare('SELECT * FROM social_links ORDER BY display_order ASC, id ASC').all();
  return res.json({ success: true, data: rows });
});

router.post('/social', (req, res) => {
  const { platform, url, status, display_order } = req.body;
  if (!platform || !url) return res.status(400).json({ success: false, error: 'Platform and URL are required' });

  const result = db.prepare(`
    INSERT INTO social_links (platform, url, status, display_order)
    VALUES (?, ?, ?, ?)
  `).run(platform, url, status || 'published', Number(display_order) || 0);

  logActivity(req.admin.email, 'CREATE_SOCIAL', `Added social link: ${platform}`, req);
  return res.json({ success: true, data: { id: result.lastInsertRowid } });
});

router.put('/social/:id', (req, res) => {
  const { id } = req.params;
  const { platform, url, status, display_order } = req.body;

  db.prepare(`
    UPDATE social_links 
    SET platform = ?, url = ?, status = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(platform, url, status || 'published', Number(display_order) || 0, id);

  logActivity(req.admin.email, 'UPDATE_SOCIAL', `Updated social link ID: ${id}`, req);
  return res.json({ success: true, message: 'Social link updated' });
});

router.delete('/social/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM social_links WHERE id = ?').run(id);
  logActivity(req.admin.email, 'DELETE_SOCIAL', `Deleted social link ID: ${id}`, req);
  return res.json({ success: true, message: 'Social link deleted' });
});

// ==========================================
// 11. SEO SETTINGS CRUD
// ==========================================
router.get('/seo', (req, res) => {
  try {
    // Ensure default SEO records exist for all stone category service pages
    const existingSeo = db.prepare('SELECT page_route FROM seo_settings').all().map(r => r.page_route);
    const services = db.prepare('SELECT slug, title, h1, tagline, hero_description, catalog_category FROM services').all();
    const insertSeo = db.prepare(`
      INSERT INTO seo_settings (page_route, meta_title, meta_description, meta_keywords, og_title, og_description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    services.forEach(s => {
      const pageRoute = `/products/${s.slug}`;
      if (!existingSeo.includes(pageRoute)) {
        insertSeo.run(
          pageRoute,
          `${s.h1 || s.title} | ARPRAN Industries`,
          s.hero_description || s.tagline || `Direct quarry exporter of ${s.title} (${s.catalog_category}) from Jaipur, India to global projects.`,
          `${s.title}, ${s.catalog_category}, Indian stone exporter, Jaipur natural stone`,
          `${s.h1 || s.title} | ARPRAN Industries`,
          s.hero_description || s.tagline || `Direct quarry exporter of ${s.title}`
        );
      }
    });
  } catch (e) {
    console.error('Error auto-syncing SEO services:', e);
  }

  const rows = db.prepare('SELECT * FROM seo_settings ORDER BY id ASC').all();
  return res.json({ success: true, data: rows });
});

router.put('/seo', (req, res) => {
  const { page_route, meta_title, meta_description, meta_keywords, og_title, og_description, og_image, canonical_url } = req.body;
  if (!page_route) return res.status(400).json({ success: false, error: 'Page route is required' });

  db.prepare(`
    INSERT INTO seo_settings (page_route, meta_title, meta_description, meta_keywords, og_title, og_description, og_image, canonical_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(page_route) DO UPDATE SET
      meta_title = excluded.meta_title,
      meta_description = excluded.meta_description,
      meta_keywords = excluded.meta_keywords,
      og_title = excluded.og_title,
      og_description = excluded.og_description,
      og_image = excluded.og_image,
      canonical_url = excluded.canonical_url,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    page_route,
    meta_title,
    meta_description,
    meta_keywords,
    og_title || meta_title,
    og_description || meta_description,
    og_image || '/logo.png',
    canonical_url || null
  );

  logActivity(req.admin.email, 'UPDATE_SEO', `Updated SEO for route: ${page_route}`, req);
  return res.json({ success: true, message: 'SEO settings saved' });
});

// ==========================================
// 12. ACTIVITY LOGS & BACKUP EXPORT
// ==========================================
router.get('/logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 50').all();
  return res.json({ success: true, data: logs });
});

// Database JSON Export Backup
const handleBackupExport = (req, res) => {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      site_settings: db.prepare('SELECT * FROM site_settings').all(),
      hero_slides: db.prepare('SELECT * FROM hero_slides').all(),
      pages: db.prepare('SELECT * FROM pages').all(),
      categories: db.prepare('SELECT * FROM categories').all(),
      products: db.prepare('SELECT * FROM products').all(),
      gallery: db.prepare('SELECT * FROM gallery').all(),
      events: db.prepare('SELECT * FROM events').all(),
      documents: db.prepare('SELECT * FROM documents').all(),
      social_links: db.prepare('SELECT * FROM social_links').all(),
      seo_settings: db.prepare('SELECT * FROM seo_settings').all(),
      blogs: db.prepare('SELECT * FROM blogs').all(),
      services: db.prepare('SELECT * FROM services').all(),
      url_redirects: db.prepare('SELECT * FROM url_redirects').all()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=arpran_cms_backup_${Date.now()}.json`);
    return res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
router.get('/backup/export', handleBackupExport);

router.get('/backup', (req, res) => {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      site_settings: db.prepare('SELECT * FROM site_settings').all(),
      hero_slides: db.prepare('SELECT * FROM hero_slides').all(),
      pages: db.prepare('SELECT * FROM pages').all(),
      categories: db.prepare('SELECT * FROM categories').all(),
      products: db.prepare('SELECT * FROM products').all(),
      gallery: db.prepare('SELECT * FROM gallery').all(),
      events: db.prepare('SELECT * FROM events').all(),
      documents: db.prepare('SELECT * FROM documents').all(),
      social_links: db.prepare('SELECT * FROM social_links').all(),
      seo_settings: db.prepare('SELECT * FROM seo_settings').all(),
      blogs: db.prepare('SELECT * FROM blogs').all(),
      services: db.prepare('SELECT * FROM services').all(),
      url_redirects: db.prepare('SELECT * FROM url_redirects').all()
    };
    return res.json({ success: true, data: backup });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 13. ARCHITECTURAL BLOGS CRUD
// ==========================================
// 13. ARCHITECTURAL BLOGS & ARTICLES CRUD
// ==========================================
router.get('/blogs', (req, res) => {
  try {
    const blogs = db.prepare('SELECT * FROM blogs ORDER BY display_order ASC, id DESC').all().map(b => ({
      ...b,
      sections: typeof b.sections === 'string' ? (() => { try { return JSON.parse(b.sections); } catch (e) { return []; } })() : (b.sections || []),
      key_points: typeof b.key_points === 'string' ? (() => { try { return JSON.parse(b.key_points); } catch (e) { return []; } })() : (b.key_points || []),
      faqs: typeof b.faqs === 'string' ? (() => { try { return JSON.parse(b.faqs); } catch (e) { return []; } })() : (b.faqs || [])
    }));
    return res.json({ success: true, data: blogs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/blogs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const blog = db.prepare('SELECT * FROM blogs WHERE id = ?').get(id);
    if (!blog) return res.status(404).json({ success: false, error: 'Article not found' });
    try { blog.sections = JSON.parse(blog.sections || '[]'); } catch (e) { blog.sections = []; }
    try { blog.key_points = JSON.parse(blog.key_points || '[]'); } catch (e) { blog.key_points = []; }
    try { blog.faqs = JSON.parse(blog.faqs || '[]'); } catch (e) { blog.faqs = []; }
    return res.json({ success: true, data: blog });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/blogs', (req, res) => {
  const { title, slug, category, date, read_time, image, alt_text, excerpt, content, sections, key_points, faqs, status, display_order } = req.body;
  if (!title || !image) {
    return res.status(400).json({ success: false, error: 'Title and cover image are required' });
  }

  const blogSlug = (slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const blogDate = date || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const blogReadTime = read_time || '5 min read';
  const jsonSections = JSON.stringify(Array.isArray(sections) ? sections : []);
  const jsonPoints = JSON.stringify(Array.isArray(key_points) ? key_points : []);
  const jsonFaqs = JSON.stringify(Array.isArray(faqs) ? faqs : []);

  try {
    const result = db.prepare(`
      INSERT INTO blogs (slug, title, category, date, read_time, image, alt_text, excerpt, content, sections, key_points, faqs, status, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      blogSlug, title, category || 'Architecture & Trends', blogDate,
      blogReadTime, image, alt_text || title, excerpt || '', content || '',
      jsonSections, jsonPoints, jsonFaqs,
      status || 'published', Number(display_order) || 0
    );

    logActivity(req.admin.email, 'CREATE_BLOG', `Created blog: ${title}`, req);
    return res.json({ success: true, data: { id: result.lastInsertRowid, slug: blogSlug } });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      const altSlug = `${blogSlug}-${Date.now().toString().slice(-4)}`;
      const result = db.prepare(`
        INSERT INTO blogs (slug, title, category, date, read_time, image, alt_text, excerpt, content, sections, key_points, faqs, status, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        altSlug, title, category || 'Architecture & Trends', blogDate,
        blogReadTime, image, alt_text || title, excerpt || '', content || '',
        jsonSections, jsonPoints, jsonFaqs,
        status || 'published', Number(display_order) || 0
      );
      logActivity(req.admin.email, 'CREATE_BLOG', `Created blog: ${title}`, req);
      return res.json({ success: true, data: { id: result.lastInsertRowid, slug: altSlug } });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/blogs/:id', (req, res) => {
  const { id } = req.params;
  const { title, slug, category, date, read_time, image, alt_text, excerpt, content, sections, key_points, faqs, status, display_order } = req.body;
  if (!title || !image) {
    return res.status(400).json({ success: false, error: 'Title and cover image are required' });
  }

  const existing = db.prepare('SELECT slug FROM blogs WHERE id = ?').get(id);
  const blogSlug = (slug || existing?.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const jsonSections = JSON.stringify(Array.isArray(sections) ? sections : []);
  const jsonPoints = JSON.stringify(Array.isArray(key_points) ? key_points : []);
  const jsonFaqs = JSON.stringify(Array.isArray(faqs) ? faqs : []);

  try {
    db.prepare(`
      UPDATE blogs 
      SET title = ?, slug = ?, category = ?, date = ?, read_time = ?, image = ?,
          alt_text = ?, excerpt = ?, content = ?, sections = ?, key_points = ?, faqs = ?,
          status = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title, blogSlug, category || 'Architecture & Trends', date || '', read_time || '5 min read', image,
      alt_text || title, excerpt || '', content || '',
      jsonSections, jsonPoints, jsonFaqs,
      status || 'published', Number(display_order) || 0, id
    );

    logActivity(req.admin.email, 'UPDATE_BLOG', `Updated blog ID: ${id}`, req);
    return res.json({ success: true, message: 'Blog article updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/blogs/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM blogs WHERE id = ?').run(id);
    logActivity(req.admin.email, 'DELETE_BLOG', `Deleted blog ID: ${id}`, req);
    return res.json({ success: true, message: 'Blog article deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 14. PAGES MANAGEMENT (/pages, /pages/:slug, /about alias)
// ==========================================
router.get('/pages', (req, res) => {
  const pages = db.prepare('SELECT id, slug, title, h1, tagline, status, updated_at FROM pages ORDER BY id ASC').all();
  return res.json({ success: true, data: pages });
});

router.get('/pages/:slug', (req, res) => {
  const { slug } = req.params;
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
  if (!page) {
    return res.status(404).json({ success: false, error: `Page '${slug}' not found` });
  }
  try {
    page.content = JSON.parse(page.content);
  } catch (e) { }
  return res.json({ success: true, data: page });
});

router.put('/pages/:slug', (req, res) => {
  const { slug } = req.params;
  const { title, h1, tagline, content, status } = req.body;
  const contentStr = typeof content === 'object' ? JSON.stringify(content) : (content || '{}');

  const existing = db.prepare('SELECT id FROM pages WHERE slug = ?').get(slug);
  if (existing) {
    db.prepare(`
      UPDATE pages 
      SET title = COALESCE(?, title),
          h1 = COALESCE(?, h1),
          tagline = COALESCE(?, tagline),
          content = ?,
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?
    `).run(title, h1, tagline, contentStr, status || 'published', slug);
  } else {
    db.prepare(`
      INSERT INTO pages (slug, title, h1, tagline, content, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(slug, title || slug, h1 || slug, tagline || '', contentStr, status || 'published');
  }

  logActivity(req.admin.email, 'UPDATE_PAGE', `Updated page content for: ${slug}`, req);
  return res.json({ success: true, message: `Page '${slug}' saved successfully` });
});

// Backward compatibility alias for /about
router.get('/about', (req, res) => {
  const page = db.prepare("SELECT * FROM pages WHERE slug = 'about'").get();
  if (!page) return res.status(404).json({ success: false, error: 'About page not found' });
  try { page.content = JSON.parse(page.content); } catch (e) { }
  return res.json({ success: true, data: page });
});

router.put('/about', (req, res) => {
  const { title, h1, tagline, content, status } = req.body;
  const contentStr = typeof content === 'object' ? JSON.stringify(content) : (content || '{}');

  db.prepare(`
    UPDATE pages 
    SET title = COALESCE(?, title),
        h1 = COALESCE(?, h1),
        tagline = COALESCE(?, tagline),
        content = ?,
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE slug = 'about'
  `).run(title, h1, tagline, contentStr, status || 'published');

  logActivity(req.admin.email, 'UPDATE_ABOUT', 'Updated About Us page content', req);
  return res.json({ success: true, message: 'About Us page saved successfully' });
});

// ==========================================
// 15. SERVICES & CATEGORY DETAIL PAGES MANAGEMENT
// ==========================================
router.get('/services', (req, res) => {
  const rows = db.prepare('SELECT * FROM services ORDER BY display_order ASC, id ASC').all();
  const parsed = rows.map(r => {
    try {
      return { ...r, content: JSON.parse(r.content) };
    } catch (e) {
      return r;
    }
  });
  return res.json({ success: true, data: parsed });
});

router.get('/services/:slug', (req, res) => {
  const { slug } = req.params;
  const service = db.prepare('SELECT * FROM services WHERE slug = ?').get(slug);
  if (!service) {
    return res.status(404).json({ success: false, error: `Service '${slug}' not found` });
  }
  try {
    service.content = JSON.parse(service.content);
  } catch (e) { }
  return res.json({ success: true, data: service });
});

router.put('/services/:slug', (req, res) => {
  const { slug } = req.params;
  const { title, h1, tagline, hero_description, catalog_category, content, status, display_order, new_slug } = req.body;
  const contentStr = typeof content === 'object' ? JSON.stringify(content) : (content || '{}');

  const rawNewSlug = (new_slug || req.body.slug || slug).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  const targetSlug = rawNewSlug || slug;

  if (targetSlug !== slug) {
    const conflict = db.prepare('SELECT id FROM services WHERE slug = ?').get(targetSlug);
    if (conflict) {
      return res.status(400).json({ success: false, error: `Slug '${targetSlug}' is already in use by another collection.` });
    }
  }

  const existing = db.prepare('SELECT id FROM services WHERE slug = ?').get(slug);
  if (existing) {
    db.prepare(`
      UPDATE services 
      SET slug = ?,
          title = COALESCE(?, title),
          h1 = COALESCE(?, h1),
          tagline = COALESCE(?, tagline),
          hero_description = COALESCE(?, hero_description),
          catalog_category = COALESCE(?, catalog_category),
          content = ?,
          status = COALESCE(?, status),
          display_order = COALESCE(?, display_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?
    `).run(targetSlug, title, h1, tagline, hero_description, catalog_category, contentStr, status || 'published', Number(display_order) || 0, slug);

    if (targetSlug !== slug) {
      try {
        db.prepare(`
          INSERT INTO url_redirects (source_path, target_url, notes, redirect_type, status)
          VALUES (?, ?, ?, 301, 'active')
          ON CONFLICT(source_path) DO UPDATE SET target_url = excluded.target_url, status = 'active'
        `).run(`/products/${slug}`, `/products/${targetSlug}`, `Auto redirect from old slug ${slug} to ${targetSlug}`);
      } catch (e) { }
    }
  } else {
    db.prepare(`
      INSERT INTO services (slug, catalog_category, title, h1, tagline, hero_description, content, status, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(targetSlug, catalog_category || title, title, h1 || title, tagline, hero_description, contentStr, status || 'published', Number(display_order) || 0);
  }

  logActivity(req.admin.email, 'UPDATE_SERVICE', `Updated service page for: ${targetSlug}`, req);
  return res.json({ success: true, newSlug: targetSlug, message: `Service '${targetSlug}' saved successfully` });
});

// Update Page URL and Meta SEO simultaneously
router.put('/urls/page-seo', (req, res) => {
  const {
    current_path,
    new_path,
    title,
    meta_title,
    meta_description,
    meta_keywords,
    canonical_url,
    create_redirect
  } = req.body;

  if (!current_path) {
    return res.status(400).json({ success: false, error: 'Current page path is required' });
  }

  const cleanCurrent = current_path.startsWith('/') ? current_path.trim() : `/${current_path.trim()}`;
  let cleanNew = new_path ? (new_path.startsWith('/') ? new_path.trim() : `/${new_path.trim()}`) : cleanCurrent;
  let finalPath = cleanCurrent;

  try {
    // 1. If path is changed, handle renaming and 301 redirects
    if (cleanNew && cleanNew !== cleanCurrent) {
      if (cleanCurrent.startsWith('/products/')) {
        const oldSlug = cleanCurrent.replace('/products/', '');
        const newSlug = cleanNew.replace('/products/', '').replace(/^\//, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');

        const conflict = db.prepare('SELECT id FROM services WHERE slug = ?').get(newSlug);
        if (conflict && newSlug !== oldSlug) {
          return res.status(400).json({ success: false, error: `Slug '${newSlug}' is already in use by another collection.` });
        }

        db.prepare('UPDATE services SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?').run(newSlug, oldSlug);

        try {
          db.prepare('UPDATE categories SET slug = ? WHERE slug = ?').run(newSlug, oldSlug);
        } catch (e) { }

        if (create_redirect !== false) {
          db.prepare(`
            INSERT INTO url_redirects (source_path, target_url, notes, redirect_type, status)
            VALUES (?, ?, ?, 301, 'active')
            ON CONFLICT(source_path) DO UPDATE SET target_url = excluded.target_url, status = 'active'
          `).run(cleanCurrent, `/products/${newSlug}`, `Auto 301 redirect: ${cleanCurrent} -> /products/${newSlug}`);
        }

        finalPath = `/products/${newSlug}`;
        logActivity(req.admin.email, 'RENAME_URL', `Renamed stone category URL: ${cleanCurrent} -> ${finalPath}`, req);
      } else {
        db.prepare(`
          INSERT INTO url_redirects (source_path, target_url, notes, redirect_type, status)
          VALUES (?, ?, ?, 301, 'active')
          ON CONFLICT(source_path) DO UPDATE SET target_url = excluded.target_url, status = 'active'
        `).run(cleanCurrent, cleanNew, `Custom alias route: ${cleanCurrent} -> ${cleanNew}`);
        finalPath = cleanNew;
        logActivity(req.admin.email, 'RENAME_URL', `Custom route mapping: ${cleanCurrent} -> ${cleanNew}`, req);
      }
    }

    // 2. If URL path changed, migrate any existing SEO row
    if (finalPath !== cleanCurrent) {
      try {
        db.prepare('UPDATE seo_settings SET page_route = ? WHERE page_route = ?').run(finalPath, cleanCurrent);
      } catch (e) { }
    }

    // 3. Save / Update SEO Settings
    if (meta_title || meta_description) {
      db.prepare(`
        INSERT INTO seo_settings (page_route, meta_title, meta_description, meta_keywords, og_title, og_description, og_image, canonical_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(page_route) DO UPDATE SET
          meta_title = excluded.meta_title,
          meta_description = excluded.meta_description,
          meta_keywords = excluded.meta_keywords,
          og_title = excluded.og_title,
          og_description = excluded.og_description,
          canonical_url = excluded.canonical_url,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        finalPath,
        meta_title || `${title || 'ARPRAN'} | Luxury Natural Stone`,
        meta_description || 'Direct quarry exporter of Indian Granite, Makrana White Marble & Veneers.',
        meta_keywords || '',
        meta_title || title || 'ARPRAN Stone',
        meta_description || '',
        '/logo.png',
        canonical_url || null
      );
      logActivity(req.admin.email, 'UPDATE_SEO', `Updated SEO for route: ${finalPath}`, req);
    }

    return res.json({
      success: true,
      newPath: finalPath,
      message: `Updated URL and SEO meta for ${finalPath} successfully!`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// URL Rename & Slug Alias Endpoint
router.put('/urls/rename', (req, res) => {
  const { current_path, new_path, title, create_redirect } = req.body;
  if (!current_path || !new_path) {
    return res.status(400).json({ success: false, error: 'current_path and new_path are required' });
  }

  const cleanCurrent = current_path.startsWith('/') ? current_path.trim() : `/${current_path.trim()}`;
  const cleanNew = new_path.startsWith('/') ? new_path.trim() : `/${new_path.trim()}`;

  if (cleanCurrent === cleanNew) {
    return res.json({ success: true, message: 'No change detected in URL path' });
  }

  try {
    if (cleanCurrent.startsWith('/products/')) {
      const oldSlug = cleanCurrent.replace('/products/', '');
      const newSlug = cleanNew.replace('/products/', '').replace(/^\//, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');

      const conflict = db.prepare('SELECT id FROM services WHERE slug = ?').get(newSlug);
      if (conflict) {
        return res.status(400).json({ success: false, error: `Slug '${newSlug}' is already in use by another collection.` });
      }

      db.prepare('UPDATE services SET slug = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?').run(newSlug, oldSlug);

      try {
        db.prepare('UPDATE categories SET slug = ? WHERE slug = ?').run(newSlug, oldSlug);
      } catch (e) { }

      try {
        db.prepare('UPDATE seo_settings SET page_route = ? WHERE page_route = ?').run(`/products/${newSlug}`, cleanCurrent);
      } catch (e) { }

      if (create_redirect !== false) {
        db.prepare(`
          INSERT INTO url_redirects (source_path, target_url, notes, redirect_type, status)
          VALUES (?, ?, ?, 301, 'active')
          ON CONFLICT(source_path) DO UPDATE SET target_url = excluded.target_url, status = 'active'
        `).run(cleanCurrent, `/products/${newSlug}`, `Auto 301 redirect: ${cleanCurrent} -> /products/${newSlug}`);
      }

      logActivity(req.admin.email, 'RENAME_URL', `Renamed stone category URL: ${cleanCurrent} -> /products/${newSlug}`, req);
      return res.json({ success: true, newPath: `/products/${newSlug}`, message: `URL updated successfully to /products/${newSlug}` });
    }

    // For other core pages, create or update a direct forwarding rule
    db.prepare(`
      INSERT INTO url_redirects (source_path, target_url, notes, redirect_type, status)
      VALUES (?, ?, ?, 301, 'active')
      ON CONFLICT(source_path) DO UPDATE SET target_url = excluded.target_url, status = 'active'
    `).run(cleanCurrent, cleanNew, `Custom alias route: ${cleanCurrent} -> ${cleanNew}`);

    try {
      db.prepare('UPDATE seo_settings SET page_route = ? WHERE page_route = ?').run(cleanNew, cleanCurrent);
    } catch (e) { }

    logActivity(req.admin.email, 'RENAME_URL', `Custom route mapping: ${cleanCurrent} -> ${cleanNew}`, req);
    return res.json({ success: true, newPath: cleanNew, message: `URL mapping created: ${cleanCurrent} now routes to ${cleanNew}` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 15. URL REDIRECTS & SHORT LINKS
// ==========================================
router.get('/redirects', (req, res) => {
  const redirects = db.prepare('SELECT * FROM url_redirects ORDER BY id DESC').all();
  return res.json({ success: true, data: redirects });
});

router.post('/redirects', (req, res) => {
  const { source_path, target_url, redirect_type, notes, status } = req.body;
  if (!source_path || !target_url) {
    return res.status(400).json({ success: false, error: 'source_path and target_url are required' });
  }

  const cleanSource = source_path.startsWith('/') ? source_path.trim() : `/${source_path.trim()}`;

  try {
    const info = db.prepare(`
      INSERT INTO url_redirects (source_path, target_url, redirect_type, notes, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(cleanSource, target_url.trim(), Number(redirect_type) || 301, notes || '', status || 'active');

    logActivity(req.admin.email, 'CREATE_REDIRECT', `Created URL redirect: ${cleanSource} -> ${target_url}`, req);
    return res.json({ success: true, id: info.lastInsertRowid, message: 'URL redirect created successfully' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: 'A redirect for this source path already exists.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/redirects/:id', (req, res) => {
  const { id } = req.params;
  const { source_path, target_url, redirect_type, notes, status } = req.body;
  const cleanSource = source_path.startsWith('/') ? source_path.trim() : `/${source_path.trim()}`;

  db.prepare(`
    UPDATE url_redirects
    SET source_path = ?,
        target_url = ?,
        redirect_type = ?,
        notes = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(cleanSource, target_url.trim(), Number(redirect_type) || 301, notes || '', status || 'active', id);

  logActivity(req.admin.email, 'UPDATE_REDIRECT', `Updated URL redirect #${id}: ${cleanSource}`, req);
  return res.json({ success: true, message: 'URL redirect updated successfully' });
});

router.delete('/redirects/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM url_redirects WHERE id = ?').run(id);
  logActivity(req.admin.email, 'DELETE_REDIRECT', `Deleted URL redirect #${id}`, req);
  return res.json({ success: true, message: 'URL redirect deleted successfully' });
});

// ==========================================
// 16. PAGE-WISE IMAGES MANAGEMENT CRUD
// ==========================================
router.get('/page-images', (req, res) => {
  try {
    const { page } = req.query;
    let query = "SELECT * FROM page_images";
    const params = [];
    if (page && page !== 'all') {
      query += " WHERE page_slug = ?";
      params.push(page);
    }
    query += " ORDER BY page_slug ASC, display_order ASC, id ASC";
    const images = db.prepare(query).all(...params);
    return res.json({ success: true, data: images });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/page-images', (req, res) => {
  const { page_slug, section, title, alt_text, image_url, caption, link_url, display_order, status } = req.body;
  if (!title || !image_url) {
    return res.status(400).json({ success: false, error: 'Title and image_url are required' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO page_images (page_slug, section, title, alt_text, image_url, caption, link_url, display_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      page_slug || 'home',
      section || 'General',
      title.trim(),
      alt_text ? alt_text.trim() : title.trim(),
      image_url.trim(),
      caption || '',
      link_url || '',
      Number(display_order) || 0,
      status || 'published'
    );

    logActivity(req.admin.email, 'CREATE_PAGE_IMAGE', `Added image for [${page_slug || 'home'}]: "${title}"`, req);
    return res.json({ success: true, id: info.lastInsertRowid, message: 'Image added successfully to page' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/page-images/:id', (req, res) => {
  const { id } = req.params;
  const { page_slug, section, title, alt_text, image_url, caption, link_url, display_order, status } = req.body;

  try {
    db.prepare(`
      UPDATE page_images
      SET page_slug = ?,
          section = ?,
          title = ?,
          alt_text = ?,
          image_url = ?,
          caption = ?,
          link_url = ?,
          display_order = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      page_slug || 'home',
      section || 'General',
      title.trim(),
      alt_text ? alt_text.trim() : title.trim(),
      image_url.trim(),
      caption || '',
      link_url || '',
      Number(display_order) || 0,
      status || 'published',
      id
    );

    logActivity(req.admin.email, 'UPDATE_PAGE_IMAGE', `Updated image #${id}: "${title}"`, req);
    return res.json({ success: true, message: 'Image updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/page-images/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM page_images WHERE id = ?').run(id);
    logActivity(req.admin.email, 'DELETE_PAGE_IMAGE', `Deleted page image #${id}`, req);
    return res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 17. FOOTER MANAGER CRUD
// ==========================================
router.get('/footer', (req, res) => {
  try {
    const links = db.prepare("SELECT * FROM footer_links ORDER BY display_order ASC, id ASC").all();
    const settingsRows = db.prepare('SELECT key, value FROM site_settings').all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    return res.json({
      success: true,
      data: {
        links,
        settings
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/footer/links', (req, res) => {
  const { title, url, column_name, display_order, status } = req.body;
  if (!title || !url) {
    return res.status(400).json({ success: false, error: 'Link Title and URL are required' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO footer_links (column_name, title, url, display_order, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(column_name || 'company', title.trim(), url.trim(), Number(display_order) || 0, status || 'active');

    logActivity(req.admin.email, 'CREATE_FOOTER_LINK', `Added footer link: "${title}" -> ${url}`, req);
    return res.json({ success: true, id: info.lastInsertRowid, message: 'Footer link added successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/footer/links/:id', (req, res) => {
  const { id } = req.params;
  const { title, url, column_name, display_order, status } = req.body;

  try {
    db.prepare(`
      UPDATE footer_links
      SET column_name = ?,
          title = ?,
          url = ?,
          display_order = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(column_name || 'company', title.trim(), url.trim(), Number(display_order) || 0, status || 'active', id);

    logActivity(req.admin.email, 'UPDATE_FOOTER_LINK', `Updated footer link #${id}: "${title}"`, req);
    return res.json({ success: true, message: 'Footer link updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/footer/links/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM footer_links WHERE id = ?').run(id);
    logActivity(req.admin.email, 'DELETE_FOOTER_LINK', `Deleted footer link #${id}`, req);
    return res.json({ success: true, message: 'Footer link deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/footer/links/reset', (req, res) => {
  try {
    db.prepare('DELETE FROM footer_links').run();
    const insertLink = db.prepare('INSERT INTO footer_links (column_name, title, url, display_order) VALUES (?, ?, ?, ?)');
    const defaultLinks = [
      ['company', 'Home', '/', 1],
      ['company', 'About Us', '/about', 2],
      ['company', 'Product', '/products', 3],
      ['company', 'Finishes', '/finishes', 4],
      ['company', 'Blog', '/blog', 5],
      ['company', 'Contact Us', '/contact', 6]
    ];
    defaultLinks.forEach(l => insertLink.run(...l));

    logActivity(req.admin.email, 'RESET_FOOTER_LINKS', 'Reset footer links to standard navbar items', req);
    return res.json({ success: true, message: 'Footer links reset to navbar items successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/footer/settings', (req, res) => {
  const {
    address_jaipur, address_melbourne, phone, whatsapp, email,
    australia_phone, copyright_text, footer_tagline, newsletter_title
  } = req.body;

  try {
    const upsertSetting = db.prepare(`
      INSERT INTO site_settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    if (address_jaipur !== undefined) upsertSetting.run('address_jaipur', address_jaipur);
    if (address_melbourne !== undefined) upsertSetting.run('address_melbourne', address_melbourne);
    if (phone !== undefined) upsertSetting.run('phone', phone);
    if (whatsapp !== undefined) upsertSetting.run('whatsapp', whatsapp);
    if (email !== undefined) upsertSetting.run('email', email);
    if (australia_phone !== undefined) upsertSetting.run('australia_phone', australia_phone);
    if (copyright_text !== undefined) upsertSetting.run('copyright_text', copyright_text);
    if (footer_tagline !== undefined) upsertSetting.run('footer_tagline', footer_tagline);
    if (newsletter_title !== undefined) upsertSetting.run('newsletter_title', newsletter_title);

    logActivity(req.admin.email, 'UPDATE_FOOTER_SETTINGS', 'Updated footer addresses and company information', req);
    return res.json({ success: true, message: 'Footer settings updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

