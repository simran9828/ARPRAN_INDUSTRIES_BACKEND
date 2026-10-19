import db from './database.js';

// 1. Update Home Page
const homeRow = db.prepare("SELECT content FROM pages WHERE slug = 'home'").get();
let homeContent = homeRow ? JSON.parse(homeRow.content) : {};

if (!homeContent.why_choose) {
  homeContent.why_choose = {
    badge: 'Architectural Partnership & Advantage',
    heading: 'Why Leading Architects & Builders Trust ARPRAN',
    description: 'From direct quarry extraction to computerized diamond gangsaw slicing, dry-lay sequencing, and seaworthy containerized export, we deliver precision natural stone tailored for landmark architecture.',
    pillars: [
      {
        num: '01',
        title: 'Direct Quarry Ownership',
        badge: 'Direct Origin',
        description: 'Private mining leases across Makrana, Rajsamand, Jodhpur & Southern granite belts guarantee genuine color continuity, zero broker markups, and monolithic block integrity.',
        checkpoints: ['100% Traceable Quarry Sourcing', 'Consistent Veining & Texture']
      },
      {
        num: '02',
        title: 'Zero-Deviation Gangsaw',
        badge: '±1mm Tolerance',
        description: 'Computerized diamond multi-wire gangsaws slice calibrated slabs to exact millimeter specs. Zero thickness deviation prevents uneven floor lips and ensures flush facade cladding.',
        checkpoints: ['Calibrated 18mm / 20mm / 30mm', 'Diamond Polish Up to 95° Gloss']
      },
      {
        num: '03',
        title: 'Dry-Lay & Vein Matching',
        badge: 'Pre-Inspection',
        description: 'Every sequence is dry-laid in our Jaipur inspection facility before dispatch. Slabs are bookmatched, numbered sequentially, and high-res video proof is shared for client sign-off.',
        checkpoints: ['Bookmatched Sequence Numbering', 'Zero Hairline Crack Guarantee']
      },
      {
        num: '04',
        title: 'ISPM-15 Seaworthy Crating',
        badge: 'Port Dispatch',
        description: 'Heavy-duty pine A-frames, fumigation certified, waterproof plastic shrink-wrap, and steel banding safeguard slabs for transit from Mundra Port to job sites across 25+ countries.',
        checkpoints: ['Fumigated Seaworthy Packaging', 'Direct Mundra / Nhava Sheva Ports']
      }
    ],
    sample_box: {
      badge: 'Architect & Builder Exclusive Service',
      title: 'Request an Architectural Stone Sample Box',
      description: 'Working on a luxury residential villa, commercial facade, hotel lobby, or landscaping development? Touch and evaluate our natural stone caliber in person. We dispatch bespoke 150×150mm tile specimens with your specified surface finishes (Polished, Flamed, Honed, Leather) directly to your studio.',
      bullets: [
        'Real quarried slab cuts (150×150×20mm)',
        'Side-by-side surface finish comparison',
        'Physical ASTM / CE technical test reports',
        'Express international courier delivery'
      ],
      cta_button_text: 'Request Free Sample Box',
      cta_button_link: '/contact?subject=Sample+Box+Request',
      catalogue_button_text: 'Download E-Catalogue (PDF)',
      catalogue_button_link: '/brochure.pdf',
      studio_kit_title: 'ARPRAN Studio Kit',
      studio_kit_subtitle: 'Specimen Dimensions: 150×150mm',
      studio_kit_badge: 'Includes ASTM Physical Test Data Sheets',
      studio_kit_highlight: '100% Free for Architects',
      swatches: [
        { name: 'Makrana White', tag: 'High Gloss', subtitle: 'Mirror Polish 90°+', image: '/images/finish-polished.jpg' },
        { name: 'Black Galaxy', tag: 'Non-Slip R11', subtitle: 'Thermal Flamed', image: '/images/finish-flamed.jpg' },
        { name: 'Kandla Grey', tag: 'Velvet Matte', subtitle: 'Satin Honed', image: '/images/finish-honed.jpg' },
        { name: 'Tan Brown', tag: 'Tactile', subtitle: 'Leather Touch', image: '/images/blog-granite.jpg' }
      ]
    }
  };
}

if (!homeContent.collections_preview) {
  homeContent.collections_preview = {};
}
if (!homeContent.collections_preview.category_cards) {
  homeContent.collections_preview.category_cards = {
    'Granite Series': {
      slug: 'granite-series',
      image: '/images/hero/granite-series-hero.jpg',
      specBadge: 'Multi-Wire Gangsaw Slabs',
      desc: 'Computerized diamond gangsaw slabs (20mm/30mm) in Black Galaxy, Viscon White & Tan Brown for commercial towers and countertops.'
    },
    'Marble Series': {
      slug: 'marble-series',
      image: '/images/hero/marble-series-hero.jpg',
      specBadge: 'Makrana & Calcite Slabs',
      desc: 'Pristine Makrana white marble, Fantasy Brown, and exotic veined calcite slabs sliced with diamond gangsaw precision for luxury villas.'
    },
    'Rough Blocks': {
      slug: 'rough-blocks',
      image: '/images/hero/rough-blocks-hero.jpg',
      specBadge: 'Quarry Monoliths (6-9 cbm)',
      desc: 'Direct quarry extraction rights, dressed 6-sided gangsaw blocks with ultrasonic crack inspection for international stone factories.'
    },
    'Quartzite Series': {
      slug: 'quartzite-series',
      image: '/images/hero/quartzite-series-hero.jpg',
      specBadge: 'Mohs Hardness 7 Slabs',
      desc: 'Exotic crystalline metamorphic slabs (Silver Shine, Copper) with zero acid etching and diamond durability for focal feature walls.'
    },
    'Sandstone Series': {
      slug: 'sandstone-series',
      image: '/images/hero/sandstone-series-hero.jpg',
      specBadge: 'CE Certified Paving',
      desc: 'Natural cleft Kandla Grey & Raj Green patio packs, sawn smooth paving slabs, and bullnose pool copings with R11 non-slip rating.'
    },
    'Slate Stone': {
      slug: 'slate-stone',
      image: '/images/hero/slate-stone-hero.jpg',
      specBadge: 'Natural Cleft Tiles',
      desc: 'Foliated non-slip floor tiles, interlocking Z-cladding panels & rustic copper hearth stones with low water absorption.'
    },
    'Stone Veneer': {
      slug: 'stone-veneer',
      image: '/images/hero/stone-veneer-hero.jpg',
      specBadge: 'Ultra-Thin 2mm Flexible',
      desc: 'Revolutionary real stone sheets with fiberglass flexibility for curved columns, lightweight ceilings, and translucent backlit bars.'
    },
    'Limestone Series': {
      slug: 'limestone-series',
      image: '/images/hero/limestone-series-hero.jpg',
      specBadge: 'High-Traffic Architectural Limestone',
      desc: 'Premium Kadappa Black, Tandur & Jaisalmer limestones offering superior wear resistance and cool-foot properties for civic concourses.'
    },
    'Landscaping & Furniture': {
      slug: 'landscaping-and-furniture',
      image: '/images/hero/bright-landscaping-paving.jpg',
      specBadge: 'Solid Carved Monoliths',
      desc: 'Hand-sculpted granite benches, tiered sandstone water fountains, planters, stepping stones, and radial cobblestones for civic parks.'
    }
  };
}
if (!homeContent.collections_preview.bottom_cta_text) {
  homeContent.collections_preview.bottom_cta_text = 'Explore Complete 250+ Stone Inventory in Main Catalog';
  homeContent.collections_preview.bottom_cta_link = '/products';
}

if (!homeContent.about_preview) {
  homeContent.about_preview = {};
}
if (!homeContent.about_preview.trust_strip) {
  homeContent.about_preview.trust_strip = ['10+ Yrs Quarrying', '25+ Nations'];
}

db.prepare("UPDATE pages SET content = ? WHERE slug = 'home'").run(JSON.stringify(homeContent));
console.log('✓ Home Page content enriched in SQLite.');

// 2. Update About Page
const aboutRow = db.prepare("SELECT content FROM pages WHERE slug = 'about'").get();
let aboutContent = aboutRow ? JSON.parse(aboutRow.content) : {};

aboutContent.work_process_badge = aboutContent.work_process_badge || 'Quarry to Architecture Workflow';
aboutContent.work_process_heading = aboutContent.work_process_heading || 'Our Work Process';
aboutContent.work_process_description = aboutContent.work_process_description || 'Every slab, tile, and bespoke architectural element moves through our rigorous 12-stage manufacturing cycle — ensuring certified dimensional tolerance and seaworthy export dispatch.';
aboutContent.pillars_badge = aboutContent.pillars_badge || 'Quality Standards';
aboutContent.pillars_heading = aboutContent.pillars_heading || 'Our 4 Quality Standards';
aboutContent.pillars_description = aboutContent.pillars_description || 'Material, Manufacturing, Delivery, and Relationship-Driven Excellence.';

if (!aboutContent.mission) {
  aboutContent.mission = {
    heading: 'Our Mission',
    statement: 'To be a leading supplier and exporter of natural stone by consistently delivering high-quality materials, innovative stone solutions, and reliable export services. We are dedicated to creating lasting value for architects, builders, landscapers, and homeowners worldwide through integrity, precision, and excellence in natural stone processing.'
  };
}

if (!aboutContent.workProcess || aboutContent.workProcess.length < 12) {
  aboutContent.workProcess = [
    { step: '01', title: '1. Stone Selection', subtitle: 'Carefully Selected Natural Stone', description: 'Rigorous geological selection of natural stone blocks with consistent textures, mineral composition, and high durability.', image: '/images/process/1-block-procuring.jpg' },
    { step: '02', title: '2. Block Procuring', subtitle: 'Direct Quarry Bench Extraction', description: 'Direct procurement of raw natural stone blocks from trusted quarry strata, ensuring dependable volume and monolithic density.', image: '/images/process/2-sawing.jpg' },
    { step: '03', title: '3. Sawing', subtitle: 'Computerized Gangsaw Processing', description: 'Precision diamond multi-wire gangsaw slicing into uniform calibrated slabs with continuous water cooling to protect stone integrity.', image: '/images/process/3-edge-cutting.jpg' },
    { step: '04', title: '4. Edge Cutting', subtitle: 'Accurate Orthogonal Dimensions', description: 'Laser-aligned CNC bridge saws cut calibrated slabs and tiles to accurate dimensions, making fabrication and installation faster.', image: '/images/process/4-sandblast.jpg' },
    { step: '05', title: '5. Surface Finishing', subtitle: 'Precision Surface Treatments', description: 'Automated processing of mirror polish, honed velvet, non-slip thermal flamed, and antique leathered surface treatments.', image: '/images/process/5-waterproofing.jpg' },
    { step: '06', title: '6. Quality Inspection', subtitle: 'Dry-Lay & Vein Matching', description: 'Every slab is carefully inspected, dry-laid, and pattern-matched to create seamless patterns and visually balanced surfaces across luxury spaces.', image: '/images/process/6-packaging.jpg' },
    { step: '07', title: '7. Cleaning', subtitle: 'Thorough High-Pressure Rinse', description: 'Multi-stage freshwater wash and squeegee drying to remove cutting slurry, micro-dust, and stone residue before packing.', image: '/images/process/8-cleaning.jpg' },
    { step: '08', title: '8. Packaging', subtitle: 'Expert Worthy Packaging', description: 'Secure, export-ready packaging designed to protect premium marble and natural stone slabs during handling, transportation, and international delivery.', image: '/images/process/7-stock.jpg' },
    { step: '09', title: '9. Stock Management', subtitle: 'Systematic Inventory Control', description: 'Systematic warehousing and digitized bundle tracking under heavy overhead gantry yards for rapid container export dispatch.', image: '/images/process/9-inspection.jpg' },
    { step: '10', title: '10. Final Inspection', subtitle: 'Zero-Deviation Verification', description: 'Final quality verification checking thickness consistency, surface finish, squareness, and export crating compliance.', image: '/images/process/10-loading.jpg' },
    { step: '11', title: '11. Loading & Delivery', subtitle: 'Reliable Container Ocean Transit', description: 'Professional container stuffing, heavy timber bracing, and reliable ocean freight delivery to meet international project requirements efficiently.', image: '/images/process/11-implementation.jpg' },
    { step: '12', title: '12. Project Implementation', subtitle: 'Distinctive Architectural Spaces', description: 'To provide premium natural stone solutions that inspire architects, designers, builders, and customers to create beautiful, durable, and distinctive spaces.', image: '/images/process/12-completed.jpg' }
  ];
}

db.prepare("UPDATE pages SET content = ? WHERE slug = 'about'").run(JSON.stringify(aboutContent));
console.log('✓ About Page content enriched in SQLite.');

// 3. Update Contact Page
const contactRow = db.prepare("SELECT content FROM pages WHERE slug = 'contact'").get();
let contactContent = contactRow ? JSON.parse(contactRow.content) : {};

contactContent.header = contactContent.header || {
  badge: 'Direct Export Division',
  h1: 'Contact Arpran Industries – Your Natural Stone Partner',
  subtitle: 'Looking for premium natural stone slabs, granite, sandstone, quartzite, slate stone, or limestone? Get in touch with Arpran Industries for product enquiries, bulk orders, custom requirements, and international export solutions. Our team is ready to help you find the right natural stone for your architectural, commercial, and landscaping projects.'
};
contactContent.offices_section = contactContent.offices_section || {
  badge: 'International Presence',
  heading: 'Headquarters & International Office',
  description: 'Direct communication with our quarry directors and logistics specialists.',
  hq_title: 'Corporate HQ & Processing Plant',
  country_badge: 'India'
};
contactContent.instant_wa = contactContent.instant_wa || {
  title: 'Instant WhatsApp Quotations',
  description: "Send your project blueprints or required slab quantities directly to our director's desk for instant FOB Mundra / CIF port estimates.",
  button_text: 'Chat With Quarry Director'
};
contactContent.rfq_form = contactContent.rfq_form || {
  badge: 'Direct Factory Submission',
  title: 'Request Stone Specification Quotation',
  description: 'Fill in your project requirements below. Our commercial department will provide calibrated slab photos, laboratory test reports, and CIF freight pricing.',
  trust_badge_1: 'NDA Confidentiality Guaranteed',
  trust_badge_2: '24-Hour Quotation Turnaround'
};
contactContent.faqs_badge = contactContent.faqs_badge || 'Frequently Asked Questions';
contactContent.faqs_heading = contactContent.faqs_heading || 'Stone Export & Logistics Information';
if (!contactContent.faqs || contactContent.faqs.length === 0) {
  contactContent.faqs = [
    {
      question: 'What is the standard container capacity for slabs?',
      answer: 'A 20ft heavy-duty ocean container holds approx 400 to 450 sqm of 20mm granite slabs, or approx 300 sqm of 30mm slabs, subject to the weight limits of the discharge port (usually 21 to 27 metric tons).'
    },
    {
      question: 'How are the slabs packaged for export?',
      answer: 'All slabs are loaded on certified ISPM-15 heat-treated fumigated wooden A-frames. Slabs are individually cushioned with foam sheets and strapped with heavy-gauge steel bands to prevent transit movement.'
    },
    {
      question: 'Can we order mixed stone varieties in one container?',
      answer: 'Yes. We frequently pack mixed containers containing granite slabs, marble tiles, and flexible stone veneer crates together to maximize space utilization for project developers.'
    },
    {
      question: 'What is the typical production and shipping lead time?',
      answer: 'Factory gangsaw cutting and finishing takes 10 to 18 days. Transit time from Mundra Port to destination ports is approximately 18 to 24 days.'
    }
  ];
}

db.prepare("UPDATE pages SET content = ? WHERE slug = 'contact'").run(JSON.stringify(contactContent));
console.log('✓ Contact Page content enriched in SQLite.');

// 4. Products Page Record
db.prepare(`
  INSERT INTO pages (slug, title, h1, tagline, content, status)
  VALUES ('products', 'Comprehensive Architectural Stone Collections | Natural Stone Catalog', 'Comprehensive Architectural Stone Collections', 'Over 250 hand-selected stone varieties spanning 12 distinct categories. Calibrated gangsaw slabs, dimensional tiles, and ultra-thin flexible veneers processed directly in Rajasthan.', '{"badge":"Architectural Stone Catalog"}', 'published')
  ON CONFLICT(slug) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
`).run();
console.log('✓ Products Page record ensured in SQLite.');

// 5. Blogs Page Record
db.prepare(`
  INSERT INTO pages (slug, title, h1, tagline, content, status)
  VALUES ('blogs', 'Architectural Stone Journal & Material Insights', 'Architectural Stone Journal & Material Guides', 'Insights on natural stone geology, diamond gangsaw fabrication, slip-resistance standards, and innovative surface treatments from our technical team.', '{"badge":"Stone Journal & Guides"}', 'published')
  ON CONFLICT(slug) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
`).run();
console.log('✓ Blogs Page record ensured in SQLite.');

console.log('All CMS content structures migration completed successfully!');
process.exit(0);
