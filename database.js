import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data folder exists
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'arpran_cms.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance concurrency
db.pragma('journal_mode = WAL');

// Initialize database tables
export function initDatabase() {
  db.exec(`
    -- 1. Admins Table
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT 'Super Admin',
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 1b. Users Table (Customer & Architectural Client Authentication)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT 'Client',
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Site Settings Table (Key-Value single source of truth)
    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Hero Slides Table
    CREATE TABLE IF NOT EXISTS hero_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      tag TEXT,
      highlight TEXT,
      description TEXT,
      image TEXT NOT NULL,
      button_text TEXT DEFAULT 'Explore Collections',
      button_link TEXT DEFAULT '/products',
      status TEXT DEFAULT 'published',
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Pages Content Table (e.g. 'about', 'home')
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      h1 TEXT,
      tagline TEXT,
      content TEXT, -- JSON structure of sections
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Product Categories Table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      catalog_category TEXT,
      description TEXT,
      image TEXT,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Products Table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER,
      category_name TEXT NOT NULL,
      short_description TEXT,
      full_description TEXT,
      main_image TEXT NOT NULL,
      additional_images TEXT DEFAULT '[]', -- JSON array of image URLs
      specifications TEXT DEFAULT '{}',   -- JSON key-values
      finishes TEXT DEFAULT '["Polish", "Flamed", "Honed"]', -- JSON array
      color TEXT,
      page_number INTEGER,
      is_featured INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published', -- 'published' or 'draft'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );

    -- 7. Media Gallery Table
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      alt_text TEXT,
      category TEXT DEFAULT 'General',
      image_url TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Events Table
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      location TEXT,
      image TEXT,
      external_link TEXT,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. Documents Table (PDFs, Catalogs, Certificates)
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT NOT NULL,
      file_type TEXT DEFAULT 'PDF',
      file_size INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. Social Media Links Table
    CREATE TABLE IF NOT EXISTS social_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT DEFAULT 'published',
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. SEO Settings Table
    CREATE TABLE IF NOT EXISTS seo_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_route TEXT UNIQUE NOT NULL,
      meta_title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      meta_keywords TEXT,
      og_title TEXT,
      og_description TEXT,
      og_image TEXT,
      canonical_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 12. Admin Activity Logs Table
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. Architectural Blogs & Articles Table
    CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT,
      read_time TEXT,
      image TEXT NOT NULL,
      alt_text TEXT,
      excerpt TEXT,
      content TEXT,
      sections TEXT DEFAULT '[]', -- JSON array of { heading: '', subheading: '', content: '' }
      key_points TEXT DEFAULT '[]', -- JSON array of strings
      faqs TEXT DEFAULT '[]', -- JSON array of { question: '', answer: '' }
      status TEXT DEFAULT 'published',
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 14. Category & Service Detail Pages Table
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      catalog_category TEXT NOT NULL,
      title TEXT NOT NULL,
      h1 TEXT NOT NULL,
      tagline TEXT,
      hero_description TEXT,
      content TEXT, -- JSON structure of trustBadges, whatIs, whatWeProvide, faqs
      status TEXT DEFAULT 'published',
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 15. URL Redirects & Short Links Table
    CREATE TABLE IF NOT EXISTS url_redirects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_path TEXT UNIQUE NOT NULL,
      target_url TEXT NOT NULL,
      redirect_type INTEGER DEFAULT 301,
      notes TEXT,
      hits INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 16. Page-wise Image Management Table
    CREATE TABLE IF NOT EXISTS page_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_slug TEXT NOT NULL DEFAULT 'home',
      section TEXT DEFAULT 'general',
      title TEXT NOT NULL,
      alt_text TEXT,
      image_url TEXT NOT NULL,
      caption TEXT,
      link_url TEXT,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 17. Footer Navigation Links Table
    CREATE TABLE IF NOT EXISTS footer_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_name TEXT DEFAULT 'company',
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Auto-migration: Ensure alt_text, sections, faqs, key_points columns exist on blogs table
  try { db.exec("ALTER TABLE blogs ADD COLUMN alt_text TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE blogs ADD COLUMN sections TEXT DEFAULT '[]';"); } catch (e) {}
  try { db.exec("ALTER TABLE blogs ADD COLUMN key_points TEXT DEFAULT '[]';"); } catch (e) {}
  try { db.exec("ALTER TABLE blogs ADD COLUMN faqs TEXT DEFAULT '[]';"); } catch (e) {}
  try { db.exec("ALTER TABLE admins ADD COLUMN previous_password_hash TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE admins ADD COLUMN default_password_used INTEGER DEFAULT 0;"); } catch (e) {}
  try { db.exec("ALTER TABLE admins ADD COLUMN password_changed INTEGER DEFAULT 0;"); } catch (e) {}

  console.log('✓ SQLite Database tables verified and initialized.');
}

export default db;
