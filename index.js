import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDatabase } from './database.js';
import { connectMongoDB } from './mongodb.js';
import { seedInitialData } from './seed.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import userAuthRoutes from './routes/userAuthRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite & MongoDB Connections
initDatabase();
connectMongoDB();
seedInitialData();

// Middleware: Non-wildcard CORS supporting credentials and deployed frontend
const defaultAllowedOrigins = [
  'https://arpran-industries-frontend.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://arpran-industries.onrender.com',
];

const envOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(s => s && s !== '*'); // Disallow wildcard when credentials are used

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server) where origin is undefined
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, '');
    const isAllowed = allowedOrigins.some(o => o.replace(/\/+$/, '') === cleanOrigin);

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Private staging header (Prevent search engines from indexing)
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

// Static uploads serving
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
const frontendUploads = path.resolve(__dirname, '../frontend/public/uploads');
if (fs.existsSync(frontendUploads)) {
  app.use('/uploads', express.static(frontendUploads));
}

// API Routes
app.use('/api/admin', authRoutes);
app.use('/api/admin', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/auth', userAuthRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'arpran-backend', time: new Date().toISOString() });
});

// Production: serve built frontend if present (monorepo / combined deployment)
const frontendDist = path.resolve(__dirname, '../frontend/dist');
const rootDist = path.resolve(__dirname, '../dist');
const distDir = fs.existsSync(frontendDist) ? frontendDist : (fs.existsSync(rootDist) ? rootDist : null);

if (distDir) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    const indexPath = path.resolve(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Standalone API info for root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'ARPRAN INDUSTRIES Backend API',
    health: '/api/health',
    endpoints: {
      public: '/api/public/all',
      admin: '/api/admin',
      auth: '/api/auth'
    }
  });
});

// 404 handler for unrecognized endpoints
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred'
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('===============================================');
  console.log(`✓ ARPRAN CMS Backend running on port ${PORT}`);
  console.log(`✓ Public APIs: /api/public/all`);
  console.log(`✓ Admin APIs: /api/admin`);
  console.log('===============================================');
});

server.on('error', (err) => {
  console.error('Server startup error:', err);

  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  }

  process.exit(1);
});
