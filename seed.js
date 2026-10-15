import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './database.js';
import { SERVICES_LIST } from './seed-data/servicesData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function seedInitialData() {
  console.log('--- Checking & Seeding CMS Initial Data ---');

  // 1. Admin accounts are managed dynamically through DB Signup / Registration (No hardcoded credentials)
  console.log('✓ Admin accounts configured via SQLite DB registration.');

  // 2. Site Settings Seed
  const siteSettingsCount = db.prepare('SELECT COUNT(*) as count FROM site_settings').get().count;
  if (siteSettingsCount === 0) {
    const defaultSettings = [
      { key: 'site_name', value: 'Arpran Industries Pvt. Ltd.' },
      { key: 'tagline', value: "Bringing Nature's Elegance to Life" },
      { key: 'subtagline', value: 'PREMIUM NATURAL STONE, LANDSCAPING STONE & STONE FURNITURE' },
      { key: 'motto', value: 'Built by Nature. Perfected by Arpran. Delivered Worldwide.' },
      {
        key: 'about_summary',
        value: "At Arpran Industries Pvt. Ltd., we transform India's finest natural stones into architectural materials trusted worldwide. From premium granite and marble to sandstone, limestone, quartzite, slate, landscaping stone, cobbles, pebbles, and handcrafted stone furniture, every product is carefully selected and processed to deliver exceptional quality and timeless appeal. Based in Jaipur, Rajasthan, we combine over a decade of industry expertise with dependable manufacturing, rigorous quality control, and global logistics."
      },
      { key: 'phone', value: '+91-94140 68933' },
      { key: 'whatsapp', value: '919414068933' },
      { key: 'email', value: 'info@arpranindustries.com' },
      { key: 'australia_phone', value: '+61-456006677' },
      { key: 'address_jaipur', value: '143, Paschim Vihar, Vaishali Nagar, Jaipur - 302021, Rajasthan, India' },
      { key: 'address_melbourne', value: 'Factory 31/7 Dunstans Ct, Thomastown VIC 3074, Australia' },
      { key: 'address_uae', value: 'Global Logistics & Distribution Network, UAE' },
      { key: 'google_maps_url', value: 'https://maps.google.com/?q=Vaishali+Nagar+Jaipur' },
      { key: 'business_hours', value: 'Mon - Sat: 9:00 AM - 7:00 PM IST' },
      { key: 'logo_url', value: '/logo.png' },
      { key: 'favicon_url', value: '/logo.png' },
      { key: 'copyright_text', value: 'ARPRAN Industries Pvt. Ltd. All rights reserved. Registered Indian Quarrying & Export Enterprise.' },
      { key: 'maintenance_mode', value: 'false' }
    ];

    const insertSetting = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
    const insertManySettings = db.transaction((settings) => {
      for (const s of settings) insertSetting.run(s.key, s.value);
    });
    insertManySettings(defaultSettings);
    console.log(`✓ Seeded ${defaultSettings.length} Site Settings.`);
  }

  // 3. Hero Slides Seed
  const heroCount = db.prepare('SELECT COUNT(*) as count FROM hero_slides').get().count;
  if (heroCount === 0) {
    const slides = [
      {
        title: 'The World of Natural Stones',
        subtitle: 'Makrana White, Calacatta & Statuario Series',
        tag: 'Opulent White Marble Architecture',
        highlight: 'Polished Gangsaw Slabs',
        description: 'Calibrated gangsaw granite slabs, pristine Makrana marble, quartzite, sandstone, slate, natural stone veneers, and handcrafted landscaping exported from India worldwide.',
        image: '/images/hero/slide-1.jpg',
        button_text: 'Explore 12 Collections',
        button_link: '/products',
        display_order: 1,
        status: 'published'
      },
      {
        title: 'Illuminated Stone Walls & Veneers',
        subtitle: 'Ultra-Thin 2mm Natural & Translucent Stone Veneer',
        tag: 'Illuminated Stone Walls & Veneers',
        highlight: 'Peel & Stick Cladding',
        description: 'Ultra-thin 2mm natural stone veneers and translucent sheets engineered for curved walls, backlit bars, elevator cabs, and modern architectural feature walls.',
        image: '/images/hero/slide-2.jpg',
        button_text: 'Explore Veneers',
        button_link: '/products/stone-veneer',
        display_order: 2,
        status: 'published'
      },
      {
        title: 'Architectural Landscaping & Paving',
        subtitle: 'Sandstone Paving, Cobbles, Pebbles & Stone Benches',
        tag: 'Architectural Landscaping & Paving',
        highlight: 'Direct Quarry Sourcing',
        description: 'Hand-split cobbles, tumbled landscaping pebbles, calibrated sandstone pavers, and monolithic granite garden furniture direct from Rajasthan quarries.',
        image: '/images/hero/bright-landscaping-paving.jpg',
        button_text: 'View Landscaping',
        button_link: '/products/landscaping-and-furniture',
        display_order: 3,
        status: 'published'
      },
      {
        title: 'The World of Natural Stones',
        subtitle: 'Makrana White, Calacatta & Statuario Series',
        tag: 'Opulent White Marble Architecture',
        highlight: 'Direct Quarry Heritage',
        description: 'Calibrated gangsaw granite slabs, pristine Makrana marble, quartzite, sandstone, slate, natural stone veneers, and handcrafted landscaping exported from India worldwide.',
        image: '/images/hero/luxury-stone-villa.jpg',
        button_text: 'Explore 12 Collections',
        button_link: '/products',
        display_order: 4,
        status: 'published'
      }
    ];

    const insertSlide = db.prepare(`
      INSERT INTO hero_slides (title, subtitle, tag, highlight, description, image, button_text, button_link, display_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    slides.forEach(s => {
      insertSlide.run(s.title, s.subtitle, s.tag, s.highlight, s.description, s.image, s.button_text, s.button_link, s.display_order, s.status);
    });
    console.log(`✓ Seeded ${slides.length} Hero Slides.`);
  }

  // 4. Pages Content Seed (Home, About, Finishes, Contact)
  const homePage = db.prepare("SELECT id FROM pages WHERE slug = 'home'").get();
  if (!homePage) {
    const homeContent = {
      hero_card: {
        badge: "Over A Decade of Quarry Heritage",
        title: "The World of Natural Stones",
        subtitle: "Makrana White, Calacatta & Statuario Series",
        motto: "Built by Nature. Perfected by Arpran. Delivered Worldwide.",
        description: "Calibrated gangsaw granite slabs, pristine Makrana marble, quartzite, sandstone, slate, natural stone veneers, and handcrafted landscaping exported from India worldwide.",
        button_text: "Explore 12 Collections",
        button_link: "/products",
        quote_button_text: "Request Quotation",
        quote_button_link: "/contact",
        metrics: [
          { value: "12", label: "Collections" },
          { value: "250+", label: "Varieties" },
          { value: "10+ Yrs", label: "Heritage" },
          { value: "Global", label: "Export" }
        ]
      },
      about_preview: {
        badge: "Company Legacy & Quarry Origins",
        heading: "Arpran Industries Offers Premium Natural Stone for Modern Architecture & Landscaping",
        description: "Discover premium natural stone crafted to bring timeless beauty, durability, and character to modern architecture and landscaping. Arpran Industries offers a carefully selected range of natural stones, ideal for creating elegant interiors, striking exteriors, and exceptional outdoor spaces.",
        link_text: "Read our full brand heritage & infrastructure story",
        hubs: [
          { title: "Jaipur, India", subtitle: "Gangsaw Processing & Corporate HQ" }
        ],
        pillars: [
          { num: "01", title: "Quarry Direct Control", text: "Direct extraction rights across Makrana, Rajsamand, Jodhpur, and South Indian granite belts." },
          { num: "02", title: "Diamond Gangsaw Precision", text: "Calibrated slabs sliced with computerized wire and diamond blades for zero thickness deviation." },
          { num: "03", title: "Strict Quality Inspection", text: "Every slab is dry-inspected for hairline fractures, natural veining consistency, and gloss caliber." },
          { num: "04", title: "Seaworthy Export Crating", text: "Fumigated wooden A-frames and plastic wrapped bundles dispatched directly to Mundra Port." }
        ]
      },
      collections_preview: {
        badge: "Architectural Catalog",
        heading: "Explore 12 Comprehensive Stone Collections",
        description: "Over 250 curated varieties of Granite, Makrana Marble, Sandstone, Slate, Quartzite, Limestone, Natural Stone Veneers, Paving & Artifacts.",
        cta_text: "View All 250+ Stones",
        cta_link: "/products"
      },
      finishes_preview: {
        badge: "Surface Technology",
        heading: "Available Architectural Stone Finishes",
        description: "Transforming raw quarried blocks into mirror-like polished slabs, non-slip flamed outdoor pavers, and velvety honed indoor textures.",
        cta_text: "Explore All Finishes & Technical Comparison Matrix",
        cta_link: "/finishes",
        items: [
          {
            title: "Polished Finish",
            tag: "High Gloss (85° - 95°)",
            image: "/images/finish-polished.jpg",
            description: "Diamond abrasive polishing lines produce a mirror-like high reflective luster that intensifies natural veining and rich mineral coloration.",
            category: "Flooring, Walls & Slabs",
            link: "/finishes"
          },
          {
            title: "Flamed / Thermal Finish",
            tag: "High Traction Non-Slip",
            image: "/images/finish-flamed.jpg",
            description: "High-temperature oxy-acetylene torching bursts surface quartz grains, creating a rugged tactile slip-resistant exterior texture.",
            category: "Paving, Pathways & Decks",
            link: "/finishes"
          },
          {
            title: "Honed Finish",
            tag: "Smooth Velvet Matte",
            image: "/images/finish-honed.jpg",
            description: "Satin-smooth matte grinding delivers an understated contemporary surface with zero glare and exceptional tactile warmth.",
            category: "Bathrooms & Modern Interiors",
            link: "/finishes"
          }
        ]
      },
      blog_preview: {
        badge: "Stone Journal & Research",
        heading: "Latest Architectural Stone Insights",
        description: "Technical articles on granite trends, marble preservation, and surface treatments for architects and builders.",
        cta_text: "View All Articles",
        cta_link: "/blog"
      }
    };

    db.prepare(`
      INSERT INTO pages (slug, title, h1, tagline, content, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('home', 'Luxury Natural Stone, Granite & Marble Exporter', 'The World of Natural Stones', 'Over A Decade of Quarry Heritage', JSON.stringify(homeContent), 'published');
    console.log('✓ Seeded Home Page content.');
  } else {
    try {
      const existing = db.prepare("SELECT content FROM pages WHERE slug = 'home'").get();
      if (existing && existing.content) {
        const parsed = JSON.parse(existing.content);
        if (
          !parsed.about_preview ||
          !parsed.about_preview.heading ||
          parsed.about_preview.heading.toLowerCase().includes('architectural mastery')
        ) {
          parsed.about_preview = {
            badge: "Company Legacy & Quarry Origins",
            heading: "Arpran Industries Offers Premium Natural Stone for Modern Architecture & Landscaping",
            description: "Discover premium natural stone crafted to bring timeless beauty, durability, and character to modern architecture and landscaping. Arpran Industries offers a carefully selected range of natural stones, ideal for creating elegant interiors, striking exteriors, and exceptional outdoor spaces.",
            link_text: "Read our full brand heritage & infrastructure story",
            hubs: [
              { title: "Jaipur, India", subtitle: "Gangsaw Processing & Corporate HQ" }
            ],
            pillars: [
              { num: "01", title: "Quarry Direct Control", text: "Direct extraction rights across Makrana, Rajsamand, Jodhpur, and South Indian granite belts." },
              { num: "02", title: "Diamond Gangsaw Precision", text: "Calibrated slabs sliced with computerized wire and diamond blades for zero thickness deviation." },
              { num: "03", title: "Strict Quality Inspection", text: "Every slab is dry-inspected for hairline fractures, natural veining consistency, and gloss caliber." },
              { num: "04", title: "Seaworthy Export Crating", text: "Fumigated wooden A-frames and plastic wrapped bundles dispatched directly to Mundra Port." }
            ]
          };
          db.prepare("UPDATE pages SET content = ? WHERE slug = 'home'").run(JSON.stringify(parsed));
          console.log("✓ Updated home page about_preview to official target copy in SQLite.");
        }
      }
    } catch (e) {
      console.error("Error migrating home about_preview:", e.message);
    }
  }

  const aboutPage = db.prepare("SELECT id FROM pages WHERE slug = 'about'").get();
  if (!aboutPage) {
    const aboutContent = {
      genesis: {
        badge: "Our Genesis & Mission",
        heading: "Quality is not just a standard, it is our philosophy.",
        quote: "Quality is not just a standard, it is our philosophy.",
        paragraphs: [
          "At Arpran Industries, we believe that true quality is defined by consistency, precision, and longevity. Every natural stone product we manufacture and export undergoes careful selection and quality evaluation to meet international standards.",
          "From raw block extraction to final packaging, our processes are designed to preserve the natural strength and beauty of natural stone while delivering reliable specifications for modern architecture, interiors, and landscaping projects.",
          "With direct quarry sourcing, advanced processing, and dedicated logistics, Arpran Industries delivers premium natural stone worldwide with uncompromising commitment to excellence."
        ],
        stats: [
          { number: "10+ Yrs", label: "Quarrying Heritage" },
          { number: "250+", label: "Natural Varieties" },
          { number: "100%", label: "Rigorous Inspection" }
        ],
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop"
      },
      pillars: [
        {
          title: "Material Quality",
          description: "Selecting the finest natural stone blocks with uniform texture, density, and natural color."
        },
        {
          title: "Manufacturing Standards",
          description: "Precision cutting, edge profiling, and surface finishing to meet exact architectural specifications."
        },
        {
          title: "Delivery Excellence",
          description: "Safe, export-ready packaging and reliable logistics to prevent transit damage."
        },
        {
          title: "Relationship-Driven Service",
          description: "Providing end-to-end support, timely order fulfillment, and dedicated customer assistance."
        }
      ],
      workProcess: [
        { step: "01", title: "Stone Selection", desc: "Expert assessment of natural stone blocks at quarry sites." },
        { step: "02", title: "Block Procuring", desc: "Acquiring certified, structurally sound blocks for factory processing." },
        { step: "03", title: "Sawing", desc: "High-precision diamond gangsaw and multi-blade cutting to uniform slabs." },
        { step: "04", title: "Edge Cutting", desc: "Accurate calibration and bridge-saw edge trimming to exact dimensions." },
        { step: "05", title: "Surface Finishing", desc: "Polished, honed, flamed, leathered, bush-hammered, or tumbled finishes." },
        { step: "06", title: "Quality Inspection", desc: "Micron-level thickness calibration and surface flaw assessment." },
        { step: "07", title: "Cleaning", desc: "High-pressure washing and drying to remove slurry and micro-dust." },
        { step: "08", title: "Packaging", desc: "ISPM-15 fumigated heat-treated wooden crates and sea-worthy bracing." },
        { step: "09", title: "Stock Management", desc: "Systematic warehouse tagging, batch tracking, and inventory control." },
        { step: "10", title: "Final Inspection", desc: "Pre-dispatch signoff ensuring complete alignment with customer specs." },
        { step: "11", title: "Loading & Delivery", desc: "Careful container stuffing, strapping, and global port logistics." },
        { step: "12", title: "Project Implementation", desc: "Technical guidance and architectural support for flawless installation." }
      ],
      mission: {
        heading: "Our Mission",
        statement: "To be a leading global supplier and exporter of natural stone by consistently delivering high-quality materials, innovative stone solutions, and reliable export services. We are dedicated to creating lasting value for architects, builders, landscapers, and homeowners worldwide through integrity, precision, and excellence in natural stone processing."
      },
      hubs: {
        badge: "Operational Headquarters",
        heading: "Primary Processing & Global Logistics Hub",
        description: "Centrally managed from Jaipur, Rajasthan — the stone capital of India — with nationwide quarry networks and global export capabilities.",
        jaipur_functions: "Block Procurement, Gangsaw Slicing, Surface Treatments, QC & Mundra Port Logistics"
      }
    };

    db.prepare(`
      INSERT INTO pages (slug, title, h1, tagline, content, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'about',
      'About Us | Arpran Industries',
      'Quality is not just a standard, it is our philosophy.',
      'Direct Quarry Sourcing, Zero-Deviation Slabs, Dry-Lay & Vein Matching, Expert Worthy Packaging',
      JSON.stringify(aboutContent),
      'published'
    );
    console.log('✓ Seeded About Us Page content.');
  }

  const finishesPage = db.prepare("SELECT id FROM pages WHERE slug = 'finishes'").get();
  if (!finishesPage) {
    const finishesContent = {
      header: {
        h1: "Architectural Surface Finishes & Treatments",
        subtitle: "How a stone is finished dictates both its aesthetic presence and functional performance. Arpran Industries provides 6 precision surface treatments calibrated for international safety standards and design excellence."
      },
      finishes: [
        {
          id: 'polished',
          title: 'Polished Finish',
          tag: 'High Gloss (85° - 95°)',
          image: '/images/finish-polished.jpg',
          description: 'Produced using computerized multi-head polishing lines with progressive diamond abrasive grits (up to 3000 grit). Creates a mirror-like high reflective luster that magnifies natural crystalline depth, mineral veins, and color vibrancy.',
          applications: ['Luxury Interior Flooring', 'Kitchen Countertops & Islands', 'Bathroom Vanity Tops', 'Vertical Feature Walls & Lift Facias'],
          slipRating: 'Low traction when wet (P1 / R9)',
          durability: 'Extreme stain resistance when sealed with penetrating siloxane'
        },
        {
          id: 'flamed',
          title: 'Flamed / Thermal Finish',
          tag: 'High Traction Non-Slip (R11 - R12)',
          image: '/images/finish-flamed.jpg',
          description: 'Achieved by subjecting wet granite slabs to intense oxy-acetylene thermal shock (approx 2,500°C). Quartz grains expand and burst, generating a rugged, non-slip textured crystalline surface with subtle softened color tones.',
          applications: ['Exterior Walkways & Plazas', 'Swimming Pool Surrounds & Coping', 'Driveways & Heavy Foot-Traffic Areas', 'Public Civic Landscaping'],
          slipRating: 'High slip resistance (P5 / R11-R12)',
          durability: 'Virtually impervious to thermal weathering, frost, and outdoor wear'
        },
        {
          id: 'honed',
          title: 'Honed Finish',
          tag: 'Smooth Velvet Satin Matte',
          image: '/images/finish-honed.jpg',
          description: 'Stone ground to a uniform, satin-smooth flat plane using medium abrasives (up to 400-600 grit) without reaching specular gloss. Delivers an understated, glare-free contemporary aesthetic with exceptional tactile warmth.',
          applications: ['Contemporary Bathroom Flooring', 'Interior Stair Treads', 'Commercial Hallway Cladding', 'Minimalist Residential Architecture'],
          slipRating: 'Moderate slip resistance (P3 / R10)',
          durability: 'Hides microscopic foot-traffic scratches and dust better than gloss'
        },
        {
          id: 'leathered',
          title: 'Leathered / Antique Finish',
          tag: 'Tactile Satin Texture',
          image: '/images/products/silver_shine_veneer.jpg',
          description: 'Diamond-impregnated abrasive brushes follow the natural topography of the stone veins, excavating softer minerals while buffing harder quartz. Results in an undulating, velvety texture reminiscent of antique leather.',
          applications: ['Outdoor Alfresco Kitchens', 'Bar Countertops', 'Tactile Bathroom Walls', 'Bespoke Architectural Furniture'],
          slipRating: 'Good slip resistance (P4 / R10)',
          durability: 'Completely hides fingerprints, water marks, and daily smudge'
        },
        {
          id: 'bush-hammered',
          title: 'Bush-Hammered Finish',
          tag: 'Heavy Mechanical Traction',
          image: '/images/products/steps_and_risers_flamed.jpg',
          description: 'High-speed pneumatic carbide-tipped hammer heads repeatedly strike the stone surface, producing dense, uniform craters resembling natural weathered bedrock. Ideal for maximum mechanical grip.',
          applications: ['Civic Access Ramps', 'Exterior Stair Risers & Treads', 'Monumental Building Base Cladding', 'Curbstones & Rail Platforms'],
          slipRating: 'Maximum slip resistance (P5 / R13)',
          durability: 'Extreme heavy-duty abrasion and vehicular impact resistance'
        },
        {
          id: 'tumbled',
          title: 'Tumbled & Antique Finish',
          tag: 'Rustic Aged Heritage',
          image: '/images/products/cobbles_radial_paving.jpg',
          description: 'Cut stones, pavers, or cobbles are rotated in vibrating tumbling drums loaded with abrasive ceramic media and water, rounding corners and softening edges for an authentic centuries-old rustic charm.',
          applications: ['Cobblestone Driveways', 'Historic Heritage Renovations', 'Garden Pathways & Courtyards', 'Rustic Fireplace Surrounds'],
          slipRating: 'High slip resistance (P4 / R11)',
          durability: 'Weathered edges mask minor impacts and natural organic aging'
        }
      ]
    };

    db.prepare(`
      INSERT INTO pages (slug, title, h1, tagline, content, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('finishes', 'Architectural Stone Finishes & Surface Treatments', finishesContent.header.h1, finishesContent.header.subtitle, JSON.stringify(finishesContent), 'published');
    console.log('✓ Seeded Finishes Page content.');
  }

  const contactPage = db.prepare("SELECT id FROM pages WHERE slug = 'contact'").get();
  if (!contactPage) {
    const contactContent = {
      header: {
        h1: "Connect With Our Global Stone Division",
        subtitle: "Whether specifying gangsaw slabs for an international tower or sourcing flexible veneers for a bespoke villa, our stone engineers in Jaipur and Melbourne are ready to assist."
      },
      rfq_notice: "Direct communication with our quarry directors and logistics specialists."
    };

    db.prepare(`
      INSERT INTO pages (slug, title, h1, tagline, content, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('contact', 'Contact Us & Request Natural Stone Quotation', contactContent.header.h1, contactContent.header.subtitle, JSON.stringify(contactContent), 'published');
    console.log('✓ Seeded Contact Page content.');
  }

  // 5. Product Categories Seed
  const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (categoriesCount === 0) {
    const categoryDefinitions = [
      { slug: 'granite-series', name: 'Granite Slabs & Tiles', catalog_category: 'Granite Series', description: 'Calibrated Indian gangsaw slabs, tiles & custom cut-to-size granite.', image: '/images/products/alaska_white.jpg', order: 1 },
      { slug: 'marble-series', name: 'Marble Series & Makrana Calcite', catalog_category: 'Marble Series', description: 'Royal Makrana white marble, Statuario Indian, and exotic marbles.', image: '/images/products/spider_green.jpg', order: 2 },
      { slug: 'sandstone-series', name: 'Sandstone Paving & Wall Panels', catalog_category: 'Sandstone Series', description: 'Architectural sandstone for exterior paving, cladding, and pool copings.', image: '/images/hero/slide-4.jpg', order: 3 },
      { slug: 'slate-stone-series', name: 'Natural Slate Stones', catalog_category: 'Slate Stone Series', description: 'Tactile natural cleft slates for architectural roofing and floors.', image: '/images/products/autumn_slate.jpg', order: 4 },
      { slug: 'quartzite-series', name: 'Quartzite Slabs & Tiles', catalog_category: 'Quartzite Series', description: 'Ultra-hard crystalline quartzite slabs for luxury interior and exterior specs.', image: '/images/products/copper_quartzite.jpg', order: 5 },
      { slug: 'limestone-series', name: 'Limestone Series', catalog_category: 'Limestone Series', description: 'Fine-grained architectural limestones in Kadappa Black, Yellow & Tandur.', image: '/images/products/tandur_blue.jpg', order: 6 },
      { slug: 'stone-veneer', name: 'Natural Stone Veneers (2mm)', catalog_category: 'Natural Stone Veneers', description: 'Ultra-thin flexible sheets & translucent backlit stone veneer panels.', image: '/images/hero/slide-3.jpg', order: 7 },
      { slug: 'cobbles-pebbles', name: 'Cobbles & Pebbles', catalog_category: 'Cobbles & Pebbles', description: 'Hand-split granite and sandstone cobbles, landscaping pebbles.', image: '/images/hero/slide-4.jpg', order: 8 },
      { slug: 'rough-blocks', name: 'Rough Blocks', catalog_category: 'Rough Blocks', description: 'Direct quarry blocks for gangsaw processors and sculptors.', image: '/images/products/viscon_white_block.jpg', order: 9 },
      { slug: 'landscaping-and-furniture', name: 'Landscaping & Stone Furniture', catalog_category: 'Landscaping & Furniture', description: 'Handcrafted solid stone benches, fountains, planters, and birdbaths.', image: '/images/hero/slide-4.jpg', order: 10 },
      { slug: 'stone-sinks-basins', name: 'Stone Sinks & Basins', catalog_category: 'Stone Sinks & Basins', description: 'Monolithic hand-carved stone basins and vanity vessels.', image: '/images/hero/slide-1.jpg', order: 11 },
      { slug: 'stone-artifacts-inlay', name: 'Stone Artifacts & Inlay Work', catalog_category: 'Artifacts & Inlay Work', description: 'Heritage Pietra Dura marble inlay, jaali lattice, and temple carvings.', image: '/images/hero/slide-1.jpg', order: 12 }
    ];

    const insertCat = db.prepare(`
      INSERT INTO categories (slug, name, catalog_category, description, image, display_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    categoryDefinitions.forEach(c => {
      insertCat.run(c.slug, c.name, c.catalog_category, c.description, c.image, c.order, 'published');
    });
    console.log(`✓ Seeded ${categoryDefinitions.length} Product Categories.`);
  }

  // 6. Products Seed from catalog.json
  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productsCount === 0) {
    const catalogPath = path.resolve(__dirname, 'seed-data/catalog.json');
    if (fs.existsSync(catalogPath)) {
      try {
        const rawCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        const catRows = db.prepare('SELECT id, name, catalog_category FROM categories').all();
        const catMap = {};
        catRows.forEach(r => {
          if (r.catalog_category) catMap[r.catalog_category] = r;
          catMap[r.name] = r;
        });

        const insertProduct = db.prepare(`
          INSERT INTO products (
            slug, name, category_id, category_name, short_description, full_description,
            main_image, additional_images, specifications, finishes, color, page_number,
            is_featured, display_order, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        const insertBatch = db.transaction(() => {
          Object.entries(rawCatalog).forEach(([catCategoryName, items]) => {
            const matchedCat = catMap[catCategoryName] || catRows[0];
            items.forEach((item, idx) => {
              const slugBase = (item.name || `product-${count}`)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
              const uniqueSlug = `${slugBase}-${count + 1}`;

              const shortDesc = `Authentic Indian ${item.name} quarried from certified stone belts. Diamond gangsaw calibrated and polished for high-end international architectural projects.`;
              const fullDesc = `Arpran Industries supplies high-grade ${item.name} (${catCategoryName}). Processed in our modern diamond gangsaw plants in Rajasthan with strict quality control. Available in jumbo slabs, custom cut-to-size tiles, staircase steps, and exterior wall cladding. Packaged in ISPM-15 fumigated seaworthy wooden A-frames.`;

              const specs = JSON.stringify({
                "Standard Thickness": "18mm, 20mm, 30mm & Custom Gauges",
                "Compressive Strength": "180 - 240 MPa",
                "Water Absorption": "< 0.15%",
                "Packaging": "Fumigated Seaworthy Wooden A-Frames",
                "Origin": "Rajasthan / South India Quarries"
              });

              insertProduct.run(
                uniqueSlug,
                item.name,
                matchedCat ? matchedCat.id : 1,
                catCategoryName,
                shortDesc,
                fullDesc,
                item.image || '/logo.png',
                JSON.stringify([item.image || '/logo.png']),
                specs,
                JSON.stringify(['Polish', 'Flamed', 'Honed']),
                item.category || catCategoryName,
                item.page || null,
                idx < 2 ? 1 : 0, // Mark first 2 in each category as featured
                idx + 1,
                'published'
              );
              count++;
            });
          });
        });

        insertBatch();
        console.log(`✓ Successfully migrated ${count} Products from catalog.json into SQLite products table.`);
      } catch (err) {
        console.error('Error seeding products from catalog.json:', err.message);
      }
    }
  }

  // 7. Documents Seed
  const docsCount = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
  if (docsCount === 0) {
    const docs = [
      {
        title: 'ARPRAN Complete Stone Architecture & Product Catalogue',
        description: 'Comprehensive 44-page technical brochure featuring 250+ natural stones, dimensional specs, and quarry origins.',
        file_url: '/brochure.pdf',
        file_type: 'PDF',
        file_size: 26056900,
        status: 'published',
        order: 1
      },
      {
        title: 'ISO 9001:2015 Quality & Export Compliance Certification',
        description: 'Official ISO certification validating diamond gangsaw calibration, slab tolerance verification, and export packing standards.',
        file_url: '/brochure.pdf',
        file_type: 'PDF',
        file_size: 1540000,
        status: 'published',
        order: 2
      },
      {
        title: 'Natural Stone Technical Finishing & ASTM Lab Testing Matrix',
        description: 'Complete physical property test reports for compressive strength, flexural tolerance, and pendulum slip ratings.',
        file_url: '/brochure.pdf',
        file_type: 'PDF',
        file_size: 890000,
        status: 'published',
        order: 3
      }
    ];

    const insertDoc = db.prepare(`
      INSERT INTO documents (title, description, file_url, file_type, file_size, status, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    docs.forEach(d => insertDoc.run(d.title, d.description, d.file_url, d.file_type, d.file_size, d.status, d.order));
    console.log(`✓ Seeded ${docs.length} Documents.`);
  }

  // 8. Events Seed
  const eventsCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
  if (eventsCount === 0) {
    const defaultEvents = [
      {
        title: 'Jaipur International StoneMart Expo',
        description: 'Exhibiting our new jumbo Gangsaw granite slabs, bookmatched Makrana white marble, and ultra-thin flexible veneers to international architects.',
        date: 'November 2025',
        location: 'Jaipur Exhibition & Convention Centre (JECC), Sitapura, Jaipur',
        image: '/images/hero/slide-1.jpg',
        external_link: 'https://www.stonemart-india.in',
        status: 'published',
        order: 1
      },
      {
        title: 'Melbourne Architecture & Design Build Show',
        description: 'Live interactive demonstrations of 2mm ultra-thin flexible stone veneers, pool copings, and monolithic natural stone furniture.',
        date: 'March 2026',
        location: 'Melbourne Convention & Exhibition Centre, Australia',
        image: '/images/hero/slide-3.jpg',
        external_link: 'https://designbuildexpo.com.au',
        status: 'published',
        order: 2
      },
      {
        title: 'Global Stone & Facades Summit Middle East',
        description: 'Presenting large-scale exterior cladding solutions and high-temperature thermal flamed granite pavers for major urban landscape projects.',
        date: 'October 2026',
        location: 'Dubai World Trade Centre, UAE',
        image: '/images/hero/slide-4.jpg',
        external_link: 'https://www.thebig5.ae',
        status: 'published',
        order: 3
      }
    ];

    const insertEvent = db.prepare(`
      INSERT INTO events (title, description, date, location, image, external_link, status, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    defaultEvents.forEach(e => insertEvent.run(e.title, e.description, e.date, e.location, e.image, e.external_link, e.status, e.order));
    console.log(`✓ Seeded ${defaultEvents.length} Events.`);
  }

  // 9. Social Links Seed
  const socialCount = db.prepare('SELECT COUNT(*) as count FROM social_links').get().count;
  if (socialCount === 0) {
    const socials = [
      { platform: 'WhatsApp', url: 'https://wa.me/919414068933', status: 'published', order: 1 },
      { platform: 'Instagram', url: 'https://instagram.com/arpranindustries', status: 'published', order: 2 },
      { platform: 'LinkedIn', url: 'https://linkedin.com/company/arpran-industries', status: 'published', order: 3 },
      { platform: 'Facebook', url: 'https://facebook.com/arpranindustries', status: 'published', order: 4 },
      { platform: 'YouTube', url: 'https://youtube.com/@arpranindustries', status: 'published', order: 5 }
    ];

    const insertSocial = db.prepare('INSERT INTO social_links (platform, url, status, display_order) VALUES (?, ?, ?, ?)');
    socials.forEach(s => insertSocial.run(s.platform, s.url, s.status, s.order));
    console.log(`✓ Seeded ${socials.length} Social Links.`);
  }

  // 10. SEO Settings Seed
  const seoCount = db.prepare('SELECT COUNT(*) as count FROM seo_settings').get().count;
  if (seoCount === 0) {
    const seoList = [
      {
        page_route: '/',
        meta_title: 'Luxury Natural Stone, Granite & Marble Exporter',
        meta_description: "Arpran Industries Pvt. Ltd. — Bringing Nature's Elegance to Life. Direct quarry supply of Indian Granite, Makrana White Marble, Sandstone, and Flexible Stone Veneer from Jaipur to global projects.",
        meta_keywords: 'Arpran Industries, natural stone supplier, Indian granite exporter, Makrana white marble, stone veneer Jaipur, architectural paving, gangsaw slabs',
        og_title: 'Arpran Industries | Luxury Natural Stone & Granite Exporters',
        og_description: 'Direct quarry supply of Indian Granite, Makrana White Marble, Sandstone, and Flexible Stone Veneer from Jaipur to global projects.',
        og_image: '/logo.png'
      },
      {
        page_route: '/about',
        meta_title: 'About Our Heritage, Quarries & Global Infrastructure',
        meta_description: 'Learn about ARPRAN Industries Pvt. Ltd. — over a decade of natural stone quarrying in Rajasthan, state-of-the-art gangsaw processing in Jaipur, and direct ocean export logistics to Melbourne, Australia and worldwide ports.',
        meta_keywords: 'Arpran Industries history, Rajasthan stone quarries, Indian granite processing, Makrana marble factory, Jaipur stone export division, Melbourne stone warehouse',
        og_title: 'About ARPRAN Industries | Quarry Heritage & Global Infrastructure',
        og_description: 'A decade of natural stone quarrying in Rajasthan, gangsaw processing in Jaipur, and direct ocean export logistics worldwide.',
        og_image: '/logo.png'
      },
      {
        page_route: '/products',
        meta_title: '250+ Architectural Natural Stones & 12 Collections',
        meta_description: 'Explore 12 comprehensive stone collections and 250+ varieties by ARPRAN Industries. Gangsaw granite slabs, Makrana white marble, flexible veneers, sandstone paving, and custom tiles.',
        meta_keywords: 'natural stone catalog, Indian granite slabs, Makrana marble varieties, flexible stone veneer, sandstone paving, ARPRAN stones',
        og_title: 'Natural Stone Collections & Gangsaw Slabs | ARPRAN Industries',
        og_description: 'Explore 12 comprehensive stone collections and 250+ varieties by ARPRAN Industries.',
        og_image: '/logo.png'
      },
      {
        page_route: '/finishes',
        meta_title: 'Architectural Stone Finishes | Polish, Flamed, Honed',
        meta_description: 'Discover available architectural stone surface finishes from ARPRAN Industries. Compare mirror-luster polished slabs, high-traction flamed exterior pavers, and smooth velvet honed textures.',
        meta_keywords: 'stone finishes, polished granite, flamed sandstone, honed marble, leathered stone, stone surface textures',
        og_title: 'Architectural Stone Surface Finishes | ARPRAN Industries',
        og_description: 'Compare mirror-luster polished slabs, high-traction flamed exterior pavers, and smooth velvet honed textures.',
        og_image: '/images/finish-polished.jpg'
      },
      {
        page_route: '/blog',
        meta_title: 'Architectural Stone Journal & Material Insights',
        meta_description: 'Explore technical stone articles, architectural trend forecasts, and surface finishing guides by ARPRAN Industries. Written for architects, contractors, and luxury homebuilders.',
        meta_keywords: 'natural stone blog, Indian granite guides, marble selection tips, flexible stone veneer tutorial, stone paving specification',
        og_title: 'Stone Journal & Technical Insights | ARPRAN Industries',
        og_description: 'Technical stone articles, trend forecasts, and surface finishing guides by ARPRAN Industries.',
        og_image: '/images/blog-granite.jpg'
      },
      {
        page_route: '/contact',
        meta_title: 'Contact Us & Request Natural Stone Quotation',
        meta_description: 'Contact ARPRAN Industries Pvt. Ltd. in Jaipur, Rajasthan, and Melbourne, Australia. Request factory-direct container export prices, gangsaw slab photos, and custom cut-to-size stone estimates.',
        meta_keywords: 'contact Arpran Industries, stone export inquiry, Indian granite quotation, Makrana marble prices, Jaipur stone factory address',
        og_title: 'Contact ARPRAN Industries | Request Factory Quotation',
        og_description: 'Connect with our stone engineers in Jaipur and Melbourne for factory-direct container export prices and slab photos.',
        og_image: '/logo.png'
      }
    ];

    const insertSEO = db.prepare(`
      INSERT INTO seo_settings (page_route, meta_title, meta_description, meta_keywords, og_title, og_description, og_image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    seoList.forEach(s => insertSEO.run(s.page_route, s.meta_title, s.meta_description, s.meta_keywords, s.og_title, s.og_description, s.og_image));
    console.log(`✓ Seeded ${seoList.length} SEO Page configurations.`);
  }

  // 11. Initial Gallery Images Seed
  const galleryCount = db.prepare('SELECT COUNT(*) as count FROM gallery').get().count;
  if (galleryCount === 0) {
    const galleryItems = [
      { title: 'Modern Luxury Villa Stone Cladding', alt_text: 'Exterior stone veneer and gangsaw slabs', category: 'Architecture', image_url: '/images/hero/slide-1.jpg', order: 1 },
      { title: 'Illuminated Translucent Stone Wall', alt_text: 'Backlit flexible stone veneer reception wall', category: 'Interiors', image_url: '/images/hero/slide-3.jpg', order: 2 },
      { title: 'Architectural Sandstone Paving & Copings', alt_text: 'Natural stone outdoor courtyard paving', category: 'Landscaping', image_url: '/images/hero/slide-4.jpg', order: 3 },
      { title: 'Polished High-Luster Makrana Marble', alt_text: 'Mirror finish pure calcite marble slab', category: 'Finishes', image_url: '/images/finish-polished.jpg', order: 4 },
      { title: 'Thermal Flamed Exterior Granite Paver', alt_text: 'High traction non-slip flamed granite', category: 'Finishes', image_url: '/images/finish-flamed.jpg', order: 5 },
      { title: 'Velvet Satin Honed Stone Surface', alt_text: 'Smooth matte honed natural stone', category: 'Finishes', image_url: '/images/finish-honed.jpg', order: 6 }
    ];

    const insertGallery = db.prepare(`
      INSERT INTO gallery (title, alt_text, category, image_url, status, display_order)
      VALUES (?, ?, ?, ?, 'published', ?)
    `);
    galleryItems.forEach(g => insertGallery.run(g.title, g.alt_text, g.category, g.image_url, g.order));
    console.log(`✓ Seeded ${galleryItems.length} Gallery items.`);
  }

  // 12. Architectural Blogs & Articles Seed
  const blogsCount = db.prepare('SELECT COUNT(*) as count FROM blogs').get().count;
  if (blogsCount === 0) {
    const defaultBlogs = [
      {
        slug: 'top-indian-granites-trending-global-luxury-architecture',
        title: 'Top Indian Granites Trending in Global Luxury Architecture',
        category: 'Architecture & Trends',
        date: 'February 2025',
        read_time: '4 min read',
        image: '/images/blog-granite.jpg',
        excerpt: 'From Viscon White to Black Galaxy, discover why Indian granites remain the first choice for architects across Australia, Europe, and the Middle East.',
        content: 'Indian natural granite has earned an unmatched global reputation for structural durability, compressive strength, and extraordinary color diversity. Quarried from the mineral-rich belts of Rajasthan, Andhra Pradesh, and Karnataka, varieties like Viscon White, Tan Brown, and Absolute Black offer architects limitless creative freedom for exterior cladding, high-traffic commercial flooring, and luxury countertops. Their low water absorption rates and resistance to acid weathering make them ideal for coastal villas and busy commercial towers alike.',
        sections: [
          {
            heading: 'Petrographic Density & Gangsaw Calibration Tolerances',
            subheading: 'High compressive strength exceeding 180 MPa',
            content: 'Unlike softer sedimentary stones, Indian granites are plutonic igneous rocks composed predominantly of quartz and alkali feldspar. Sawn on computerized multi-blade diamond gangsaws, our slabs maintain strict ±1mm dimensional calibration, eliminating uneven lippage during architectural floor installation.'
          },
          {
            heading: 'Export Logistics & Mundra Port Crating Specifications',
            subheading: 'Fumigated A-frame seaworthy wooden packaging',
            content: 'Every export bundle is reinforced with fumigated hardwood A-frames, anti-scratch plastic film, and heavy-duty steel strapping. Shipments dispatched from Rajasthan reach Mundra and Nhava Sheva ports within 48 hours for expedited containerized ocean freight worldwide.'
          }
        ],
        key_points: [
          'Direct quarry mining across Rajasthan and South Indian granite belts',
          'Diamond multi-wire gangsaw processing ensuring uniform 20mm & 30mm thickness',
          'Low water absorption (<0.2%) providing superior freeze-thaw and stain resistance',
          'Available in Mirror Polished, Flamed Non-Slip, Leathered, and Honed finishes'
        ],
        faqs: [
          {
            question: 'What is the recommended slab thickness for commercial flooring versus exterior cladding?',
            answer: 'For interior high-traffic commercial floors, 20mm calibrated slabs are standard. For mechanically anchored exterior facades or heavy vehicle driveways, 30mm or custom 40mm slabs are recommended.'
          },
          {
            question: 'How do Indian granites compare to European or Chinese varieties in terms of durability?',
            answer: 'Indian granites are globally renowned for their dense igneous mineral composition, higher silica content, and exceptional resistance to acidic weathering and sunlight UV discoloration.'
          }
        ],
        display_order: 1
      },
      {
        slug: 'polish-vs-flamed-vs-honed-selecting-right-stone-finish',
        title: 'Polish vs. Flamed vs. Honed: Selecting the Right Stone Finish',
        category: 'Technical Guide',
        date: 'January 2025',
        read_time: '5 min read',
        image: '/images/stone-finishes-guide.jpg',
        excerpt: 'Understand how surface treatments impact slip resistance, light reflection, and longevity in commercial vs residential applications.',
        content: 'The finish of a natural stone dictates both its aesthetic presence and functional performance. While high-gloss polished surfaces highlight the crystalline depth of granite, flamed finishes create a thermal textured grip essential for exterior paving and wet areas. Honed surfaces deliver an understated, velvet-smooth matte ambiance preferred in modern minimalist interiors. Specifiers must balance visual expectations with safety standards like the Australian AS/NZS 4586 pendulum slip ratings.',
        sections: [
          {
            heading: 'Surface Texture Mechanics & Light Reflectance Values (LRV)',
            subheading: 'Comparing specular reflection across stone surface treatments',
            content: 'Polishing brings out micro-crystalline mineral veining with an 85° to 95° gloss index, ideal for vertical feature walls and luxury foyer flooring. In contrast, honed finishes disperse light uniformly, preventing harsh glare under modern LED architectural lighting.'
          },
          {
            heading: 'Slip Resistance & PTV Wet Pendulum Ratings',
            subheading: 'Complying with international public pedestrian safety codes',
            content: 'Thermal flaming involves high-temperature oxy-acetylene torching that bursts surface quartz crystals, creating an authentic non-slip tactile profile rated P4 to P5 for wet pool copings and civic sidewalks.'
          }
        ],
        key_points: [
          'Polished finish enhances deep mineral color and crystalline luster',
          'Flamed finish delivers high-traction wet slip resistance (P5 rating)',
          'Honed finish provides a glare-free satin velvet matte texture',
          'Leathered finish combines textured relief with a soft tactile feel'
        ],
        faqs: [
          {
            question: 'Can polished granite be installed in outdoor wet areas or around pools?',
            answer: 'Polished granite can become slippery when wet. For pool surrounds and exterior walkways, flamed, bush-hammered, or brushed textures are strongly recommended for safety.'
          },
          {
            question: 'Does a honed finish make natural stone more prone to staining?',
            answer: 'Honed surfaces have microscopic open pores compared to polished stone. Applying a high-grade penetrating impregnating sealer easily ensures complete oil and water repelling protection.'
          }
        ],
        display_order: 2
      },
      {
        slug: 'the-timeless-legacy-of-makrana-white-marble',
        title: 'The Timeless Legacy of Makrana White Marble',
        category: 'Heritage & Materials',
        date: 'December 2024',
        read_time: '6 min read',
        image: '/images/blog-makrana.jpg',
        excerpt: 'The iconic 99% pure calcite marble of Rajasthan that built the Taj Mahal continues to define contemporary luxury monuments worldwide.',
        content: 'Makrana White Marble is celebrated worldwide for its pure calcium carbonate composition that does not discolor or absorb water over centuries. Processed with advanced diamond gangsaw blades in Rajasthan, Arpran Industries supplies calibrated Makrana slabs to prestigious international estates and luxury hospitality developments. Its luminous translucent translucency and subtle grey veining provide a timeless palatial radiance unattainable by synthetic quartz or ceramics.',
        sections: [
          {
            heading: 'Geological Purity: 99% Pure Calcite Mineral Structure',
            subheading: 'Why Makrana marble never yellows over generations',
            content: 'Unlike Italian Carrara or engineered quartz which can contain iron deposits or resins, Makrana marble is virtually 99% pure calcium carbonate. This distinct crystalline interlocking structure ensures it never develops yellow oxidation or chemical degradation.'
          }
        ],
        key_points: [
          'Quarried exclusively from the ancient marble hills of Makrana, Rajasthan',
          'Zero chemical resin fillers or artificial mesh reinforcement needed',
          'Natural crystalline translucence allowing luminous ambient glow',
          'Used historically in iconic world heritage monuments like the Taj Mahal'
        ],
        faqs: [
          {
            question: 'Is Makrana marble suitable for luxury bathroom vanities and wet areas?',
            answer: 'Yes, Makrana marble has exceptionally low porosity compared to other calcitic marbles, making it highly resilient in bathrooms, steam showers, and luxury spa environments.'
          }
        ],
        display_order: 3
      },
      {
        slug: 'the-ultra-thin-stone-revolution-flexible-veneers',
        title: 'The Ultra-Thin Stone Revolution: Designing With 2mm Flexible Veneers',
        category: 'Innovation & Cladding',
        date: 'November 2024',
        read_time: '5 min read',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
        excerpt: 'How real stone sheets backed by fiberglass and resin allow curved walls, elevator cab weight reductions, and illuminated translucent backsplashes.',
        content: 'Natural stone veneer splits real slate, quartzite, and sandstone into micro-thin layers of 1.5mm to 2.0mm. Reinforced with polymer fiberglass, these flexible sheets weigh just 1.5 kg per square meter yet retain 100% genuine stone texture. Translucent stone veneer variants allow LED backlighting, enabling glowing amber columns, bar counters, and dynamic reception feature walls that install in a fraction of traditional slab time.',
        sections: [
          {
            heading: 'Substrate Flexibility & Curved Column Installation',
            subheading: 'Bending real quarried stone with 100% natural mineral face',
            content: 'Engineered with thermosetting polyester resin and glass fiber reinforcement, thin stone veneer sheets can flex around convex and concave radii down to 200mm without cracking the stone layer.'
          }
        ],
        key_points: [
          'Ultra-lightweight: ~1.5 to 1.8 kg/m² vs 50 kg/m² for conventional slabs',
          'Can be cut with standard carbide woodworking tools on site',
          'Translucent backing versions allow warm ambient LED illumination',
          'Direct peel-and-stick or polymer adhesive application onto existing drywall'
        ],
        faqs: [
          {
            question: 'Can translucent flexible stone veneer be used outdoors in extreme weather?',
            answer: 'Yes, when sealed with UV-stable architectural polyurethanes and bonded with exterior-grade structural adhesives, flexible veneer performs admirably across extreme temperatures.'
          }
        ],
        display_order: 4
      },
      {
        slug: 'specifying-sandstone-paving-extreme-climate-resilience',
        title: 'Specifying Sandstone Paving for Extreme Climate Resilience',
        category: 'Landscaping & Urban Design',
        date: 'October 2024',
        read_time: '4 min read',
        image: '/images/hero/slide-4.jpg',
        excerpt: 'Best practices for specifying Jodhpur and Kandla sandstone for freeze-thaw durability, pool salt resistance, and civic streetscapes.',
        content: 'Indian quartzitic sandstone quarried from Rajasthan combines warm earthy tones with exceptional compressive strength. When calibrated to uniform 22mm or 30mm thickness and sawn on all six sides, it provides an architecturally clean paving module for private courtyard gardens and expansive public plazas. Its natural thermal insulation keeps outdoor surfaces comfortable under bare feet even beneath the scorching summer sun.',
        sections: [
          {
            heading: 'Freeze-Thaw Resistance & Low Water Absorption Mechanics',
            subheading: 'Dense quartz grain bonding for alpine and coastal climates',
            content: 'High-silica Rajasthan sandstones exhibit flexural strengths above 15 MPa and water absorption under 1.5%, giving them superior freeze-thaw cycling resistance in North American and European winters.'
          }
        ],
        key_points: [
          'Calibrated thickness (22mm or 30mm) for fast, level paving installation',
          'Naturally slip-resistant cleft or sawn and shotblasted surfaces',
          'Thermal insulation prevents excessive heat buildup under strong sunlight',
          'Saltwater and pool chemical safe for coastal landscaping'
        ],
        faqs: [
          {
            question: 'What is the advantage of calibrated sandstone over uncalibrated paving?',
            answer: 'Calibrated sandstone is mechanically gauged to uniform thickness, drastically speeding up laying time and ensuring consistent mortar bed levels without steps or trip hazards.'
          }
        ],
        display_order: 5
      }
    ];

    const insertBlog = db.prepare(`
      INSERT INTO blogs (slug, title, category, date, read_time, image, excerpt, content, sections, key_points, faqs, status, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
    `);
    defaultBlogs.forEach(b => insertBlog.run(
      b.slug, b.title, b.category, b.date, b.read_time, b.image, b.excerpt, b.content,
      JSON.stringify(b.sections || []),
      JSON.stringify(b.key_points || []),
      JSON.stringify(b.faqs || []),
      b.display_order
    ));
    console.log(`✓ Seeded ${defaultBlogs.length} Architectural Blog articles.`);
  }

  // 14. Category & Service Detail Pages Seed
  const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
  if (servicesCount === 0 && SERVICES_LIST && SERVICES_LIST.length > 0) {
    const insertService = db.prepare(`
      INSERT INTO services (slug, catalog_category, title, h1, tagline, hero_description, content, status, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?)
    `);

    SERVICES_LIST.forEach((s, idx) => {
      const content = {
        trustBadges: s.trustBadges || [],
        whatIs: s.whatIs || {},
        whatWeProvide: s.whatWeProvide || {},
        faqs: s.faqs || []
      };
      insertService.run(
        s.slug,
        s.catalogCategory || s.title,
        s.title,
        s.h1 || s.title,
        s.tagline || '',
        s.heroDescription || '',
        JSON.stringify(content),
        idx + 1
      );
    });
    console.log(`✓ Seeded ${SERVICES_LIST.length} Category & Service Detail pages.`);
  }

  // 15. URL Redirects & Short Links Seed
  const redirectsCount = db.prepare('SELECT COUNT(*) as count FROM url_redirects').get().count;
  if (redirectsCount === 0) {
    const defaultRedirects = [
      { source_path: '/granite', target_url: '/products/granite-series', notes: 'Quick alias for Granite Series', redirect_type: 301 },
      { source_path: '/marble', target_url: '/products/marble-series', notes: 'Quick alias for Marble Series', redirect_type: 301 },
      { source_path: '/sandstone', target_url: '/products/sandstone-series', notes: 'Quick alias for Sandstone Series', redirect_type: 301 },
      { source_path: '/veneer', target_url: '/products/stone-veneer', notes: 'Quick alias for Ultra-thin Veneer', redirect_type: 301 },
      { source_path: '/catalog', target_url: '/products', notes: 'Legacy catalog path', redirect_type: 301 },
      { source_path: '/quote', target_url: '/contact', notes: 'Direct RFQ quote shortcut', redirect_type: 302 }
    ];

    const insertRedirect = db.prepare(`
      INSERT INTO url_redirects (source_path, target_url, notes, redirect_type, status)
      VALUES (?, ?, ?, ?, 'active')
    `);

    defaultRedirects.forEach(r => insertRedirect.run(r.source_path, r.target_url, r.notes, r.redirect_type));
    console.log(`✓ Seeded ${defaultRedirects.length} initial URL Redirects.`);
  }

  // 16. Page Images Seed (Page-wise Image Management)
  try {
    const imgCount = db.prepare('SELECT COUNT(*) as count FROM page_images').get().count;
    if (imgCount === 0) {
      const insertImg = db.prepare(`
        INSERT INTO page_images (page_slug, section, title, alt_text, image_url, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const defaultImages = [
        ['home', 'Hero Slider', 'Opulent White Marble Pavilion', 'Polished Makrana Calcite & Bookmatched Calacatta Grand Pavilion', '/images/hero/slide-1.jpg', 1],
        ['home', 'Hero Slider', 'Translucent Stone Veneer Penthouse', 'Illuminated Translucent Stone Veneer & Backlit Onyx Feature Wall', '/images/hero/slide-2.jpg', 2],
        ['home', 'Hero Slider', 'Sandstone Paving & Pool Patio', 'Architectural Sandstone Paving & Turquoise Pool Patio', '/images/hero/bright-landscaping-paving.jpg', 3],
        ['home', 'Hero Slider', 'Modern Marble Villa Exterior', 'Modern Monolithic Calcite Marble Villa Exterior & Facade', '/images/hero/luxury-stone-villa.jpg', 4],
        ['home', 'Finishes Preview', 'Polished Finish Slabs', 'Diamond Polished High Gloss Marble Finish', '/images/finish-polished.jpg', 5],
        ['home', 'Finishes Preview', 'Flamed Granite Paving', 'High Traction Non-Slip Flamed Granite', '/images/finish-flamed.jpg', 6],
        ['home', 'Finishes Preview', 'Honed Velvet Matte Surface', 'Smooth Velvet Matte Honed Stone', '/images/finish-honed.jpg', 7],
        ['about', 'Quarry Operations', 'Makrana & Jodhpur Quarry Belts', 'Direct Quarry Extraction in Rajasthan Marble Belts', '/images/about-quarry.jpg', 1],
        ['about', 'Manufacturing Plant', 'Computerized Diamond Gangsaw Lines', 'Diamond Wire Gangsaw Processing Facility', '/images/about-processing.jpg', 2],
        ['about', 'Quality Inspection', 'Dry Caliber & Gloss Testing', 'ISO Certified Caliber & Gloss Inspection', '/images/about-quality.jpg', 3],
        ['about', 'Export Logistics', 'Seaworthy Wooden A-Frames', 'Seaworthy Export Crating to Mundra Port', '/images/about-logistics.jpg', 4],
        ['products', 'Category Banner', 'Calibrated Indian Granite Series', 'Calibrated Indian Granite Slabs', '/images/service-granite.jpg', 1],
        ['products', 'Category Banner', 'Pristine Makrana Marble Series', 'Makrana Calcite & Italian Marble', '/images/service-marble.jpg', 2],
        ['products', 'Category Banner', 'Sandstone Paving & Tiles', 'Rajasthan Sandstone Calibrated Tiles', '/images/service-sandstone.jpg', 3],
        ['products', 'Category Banner', 'Flexible Stone Veneer Sheets', 'Flexible Ultra-Thin Translucent Stone Sheets', '/images/service-stone-veneer.jpg', 4],
        ['finishes', 'Surface Textures', 'High Gloss Mirror Polish', 'Mirror Polished Surface Finish', '/images/finish-polished.jpg', 1],
        ['finishes', 'Surface Textures', 'Thermal Flamed Exterior Paving', 'Flamed Thermal Slip Resistant Surface', '/images/finish-flamed.jpg', 2],
        ['finishes', 'Surface Textures', 'Velvet Matte Honed Finish', 'Velvet Matte Honed Surface', '/images/finish-honed.jpg', 3],
        ['finishes', 'Surface Textures', 'Tactile Leathered Finish', 'Tactile Antique Leather Finish', '/images/finish-leathered.jpg', 4],
        ['blog', 'Featured Article', 'Top Indian Granites in Architecture', 'Top Indian Granites Trending in Global Luxury Architecture', '/images/blog-granite.jpg', 1],
        ['blog', 'Technical Guide', 'Stone Surface Finishes Guide', 'Selecting the Right Surface Finish for Natural Stones', '/images/stone-finishes-guide.jpg', 2],
        ['blog', 'Heritage Article', 'Legacy of Makrana White Marble', 'Makrana Calcite Heritage and Contemporary Architecture', '/images/blog-makrana.jpg', 3]
      ];
      defaultImages.forEach(img => insertImg.run(...img));
      console.log(`✓ Seeded ${defaultImages.length} initial Page Images.`);
    }
  } catch (e) {
    console.error('Error seeding page_images:', e.message);
  }

  // 17. Footer Links Seed
  try {
    const linkCount = db.prepare('SELECT COUNT(*) as count FROM footer_links').get().count;
    if (linkCount === 0) {
      const insertLink = db.prepare(`
        INSERT INTO footer_links (column_name, title, url, display_order)
        VALUES (?, ?, ?, ?)
      `);
      const defaultLinks = [
        ['company', 'Home', '/', 1],
        ['company', 'About Us', '/about', 2],
        ['company', 'Product', '/products', 3],
        ['company', 'Finishes', '/finishes', 4],
        ['company', 'Blog', '/blog', 5],
        ['company', 'Contact Us', '/contact', 6]
      ];
      defaultLinks.forEach(l => insertLink.run(...l));
      console.log(`✓ Seeded ${defaultLinks.length} initial Footer Navigation Links.`);
    }
  } catch (e) {
    console.error('Error seeding footer_links:', e.message);
  }

  console.log('--- CMS Data Migration & Seeding Complete ---');
}

