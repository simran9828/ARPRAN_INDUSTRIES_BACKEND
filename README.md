# ARPRAN INDUSTRIES - Backend API

Standalone Node.js / Express / SQLite REST API service for ARPRAN Industries.

## Tech Stack
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Database**: SQLite via `better-sqlite3` (WAL mode enabled)
- **Auth**: JWT & bcryptjs
- **File Uploads**: Multer
- **CORS**: Configurable via `CORS_ORIGIN`

## Folder Structure
```
backend/
├── data/                    # Database storage & sync JSON
│   └── cms_data_sync.json   # Seed & backup content
├── routes/                  # Express API routers
│   ├── adminRoutes.js       # CMS management endpoints
│   ├── authRoutes.js        # Admin auth endpoints
│   ├── publicRoutes.js      # Public website content endpoints
│   ├── uploadRoutes.js      # Image/PDF upload endpoints
│   └── userAuthRoutes.js    # Client user auth endpoints
├── seed-data/               # Static seed data (services, stones, catalog)
│   ├── catalog.json
│   ├── servicesData.js
│   └── stoneData.js
├── uploads/                 # Static media uploads directory
│   └── .gitkeep
├── .env.example             # Environment variables template
├── .gitignore               # Ignores .env, node_modules, *.db
├── auth.js                  # JWT validation & auth middleware
├── database.js              # SQLite schema, tables & connection
├── index.js                 # Server entrypoint & route mounting
├── package.json             # Backend dependencies & npm scripts
├── render.yaml              # Render 1-click deployment blueprint
└── seed.js                  # Automatic database migration & seeding
```

## Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-frontend-domain.com
UPLOAD_DIR=uploads
```

## Running Locally
```bash
npm install
npm run dev
```
Server runs on `http://localhost:5000`.

## Key Endpoints
- `GET /` - Service status & info
- `GET /api/health` - Health check endpoint
- `GET /api/public/all` - All public website CMS data
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User signup
- `POST /api/admin/login` - Admin login
- `GET /api/admin/...` - Admin CMS resources
- `POST /api/admin/upload` - File uploader
- `GET /uploads/...` - Uploaded files static URL
