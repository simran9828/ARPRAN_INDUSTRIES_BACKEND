import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /api/public/all - Bundled public content for high performance single-turn hydration
router.get('/all', (req, res) => {
  try {
    // 1. Settings (Key-Value)
    const settingsRows = db.prepare('SELECT key, value FROM site_settings').all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    // 2. Hero Slides
    const heroSlides = db.prepare(`
      SELECT * FROM hero_slides 
      WHERE status = 'published' 
      ORDER BY display_order ASC, id ASC
    `).all();

    // 3. Categories
    const categories = db.prepare(`
      SELECT * FROM categories 
      WHERE status = 'published' 
      ORDER BY display_order ASC, id ASC
    `).all();

    // 4. Products
    const products = db.prepare(`
      SELECT * FROM products 
      WHERE status = 'published' 
      ORDER BY display_order ASC, id ASC
    `).all().map(p => ({
      ...p,
      additional_images: p.additional_images ? JSON.parse(p.additional_images) : [],
      specifications: p.specifications ? JSON.parse(p.specifications) : {},
      finishes: p.finishes ? JSON.parse(p.finishes) : []
    }));

    // 5. Pages Map (home, about, finishes, contact)
    const pagesRows = db.prepare("SELECT slug, title, h1, tagline, content FROM pages WHERE status = 'published'").all();
    const pages = {};
    pagesRows.forEach(p => {
      try { pages[p.slug] = { ...p, content: JSON.parse(p.content) }; } catch (e) { pages[p.slug] = p; }
    });
    const about = pages['about'] || null;

    // 6. Documents
    const documents = db.prepare(`
      SELECT * FROM documents 
      WHERE status = 'published' 
      ORDER BY display_order ASC, id ASC
    `).all();

    // 7. Events
    const events = db.prepare(`
      SELECT * FROM events 
      WHERE status = 'published' 
      ORDER BY display_order ASC, id ASC
    `).all();

    // 8. Gallery
    const gallery = db.prepare(`
      SELECT * FROM gallery 
      WHERE status = 'published' 
      ORDER BY display_order ASC, id ASC
    `).all();

    // 9. Social Links
    const socialLinks = db.prepare(`
      SELECT * FROM social_links 
      WHERE status = 'published' 
      ORDER BY display_order ASC, id ASC
    `).all();

    // 10. SEO Settings
    const seoSettings = db.prepare('SELECT * FROM seo_settings').all();

    // 11. Architectural Blogs
    const blogs = db.prepare("SELECT * FROM blogs WHERE status = 'published' ORDER BY display_order ASC, id DESC").all().map(b => ({
      ...b,
      sections: typeof b.sections === 'string' ? (() => { try { return JSON.parse(b.sections); } catch (e) { return []; } })() : (b.sections || []),
      key_points: typeof b.key_points === 'string' ? (() => { try { return JSON.parse(b.key_points); } catch (e) { return []; } })() : (b.key_points || []),
      faqs: typeof b.faqs === 'string' ? (() => { try { return JSON.parse(b.faqs); } catch (e) { return []; } })() : (b.faqs || [])
    }));

    // 12. Category & Service Detail Pages
    const servicesRows = db.prepare("SELECT * FROM services WHERE status = 'published' ORDER BY display_order ASC, id ASC").all();
    const services = {};
    servicesRows.forEach(s => {
      try {
        const parsed = JSON.parse(s.content);
        services[s.slug] = {
          id: s.slug,
          slug: s.slug,
          catalogCategory: s.catalog_category,
          title: s.title,
          h1: s.h1,
          tagline: s.tagline,
          heroDescription: s.hero_description,
          heroImage: parsed.heroImage || s.image || null,
          trustBadges: parsed.trustBadges || [],
          whatIs: parsed.whatIs || {},
          whatWeProvide: parsed.whatWeProvide || {},
          faqs: parsed.faqs || []
        };
      } catch (e) {
        services[s.slug] = s;
      }
    });

    // 13. URL Redirects & Short Links
    let redirects = [];
    try {
      redirects = db.prepare("SELECT source_path, target_url, redirect_type FROM url_redirects WHERE status = 'active'").all();
    } catch (e) { }

    // 14. Page Images (Page-wise Images)
    let pageImages = [];
    try {
      pageImages = db.prepare("SELECT * FROM page_images WHERE status = 'published' ORDER BY display_order ASC, id ASC").all();
    } catch (e) { }

    // 15. Footer Links
    let footerLinks = [];
    try {
      footerLinks = db.prepare("SELECT * FROM footer_links WHERE status = 'active' ORDER BY display_order ASC, id ASC").all();
    } catch (e) { }

    return res.json({
      success: true,
      data: {
        settings,
        heroSlides,
        categories,
        products,
        pages,
        blogs,
        services,
        about,
        documents,
        events,
        gallery,
        socialLinks,
        seoSettings,
        redirects,
        pageImages,
        footerLinks
      }
    });
  } catch (err) {
    console.error('Error fetching public CMS data:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error fetching content' });
  }
});

// GET /api/public/footer - Get live footer links & settings
router.get('/footer', (req, res) => {
  try {
    const links = db.prepare("SELECT * FROM footer_links WHERE status = 'active' ORDER BY display_order ASC, id ASC").all();
    const settingsRows = db.prepare('SELECT key, value FROM site_settings').all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });
    return res.json({ success: true, data: { links, settings } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/public/page-images - Get page images optionally filtered by page
router.get('/page-images', (req, res) => {
  try {
    const { page } = req.query;
    let query = "SELECT * FROM page_images WHERE status = 'published'";
    const params = [];
    if (page && page !== 'all') {
      query += " AND page_slug = ?";
      params.push(page);
    }
    query += " ORDER BY display_order ASC, id ASC";
    const images = db.prepare(query).all(...params);
    return res.json({ success: true, data: images });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/public/blogs
router.get('/blogs', (req, res) => {
  try {
    const { category } = req.query;
    let query = "SELECT * FROM blogs WHERE status = 'published'";
    const params = [];
    if (category && category !== 'All') {
      query += " AND category = ?";
      params.push(category);
    }
    query += " ORDER BY display_order ASC, id DESC";
    const rows = db.prepare(query).all(...params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve blogs' });
  }
});

// GET /api/public/pages/:slug
router.get('/pages/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const page = db.prepare("SELECT * FROM pages WHERE slug = ? AND status = 'published'").get(slug);
    if (page && page.content) {
      try { page.content = JSON.parse(page.content); } catch (e) { }
    }
    return res.json({ success: true, data: page || null });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve page content' });
  }
});

// GET /api/public/products - Filtered product query
router.get('/products', (req, res) => {
  try {
    const { category, search, featured } = req.query;
    let query = "SELECT * FROM products WHERE status = 'published'";
    const params = [];

    if (category) {
      query += " AND (category_name = ? OR category_id IN (SELECT id FROM categories WHERE slug = ?))";
      params.push(category, category);
    }

    if (featured === 'true' || featured === '1') {
      query += " AND is_featured = 1";
    }

    if (search) {
      query += " AND (name LIKE ? OR short_description LIKE ? OR category_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY display_order ASC, id ASC";

    const rows = db.prepare(query).all(...params).map(p => ({
      ...p,
      additional_images: p.additional_images ? JSON.parse(p.additional_images) : [],
      specifications: p.specifications ? JSON.parse(p.specifications) : {},
      finishes: p.finishes ? JSON.parse(p.finishes) : []
    }));

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve products' });
  }
});

// GET /api/public/categories
router.get('/categories', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM categories WHERE status = 'published' ORDER BY display_order ASC").all();
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve categories' });
  }
});

// GET /api/public/documents
router.get('/documents', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM documents WHERE status = 'published' ORDER BY display_order ASC").all();
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve documents' });
  }
});

// GET /api/public/events
router.get('/events', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM events WHERE status = 'published' ORDER BY display_order ASC").all();
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve events' });
  }
});

export default router;
