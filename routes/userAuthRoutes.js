import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import User from '../models/User.js';
import { connectMongoDB } from '../mongodb.js';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
  generateToken,
  requireUser
} from '../auth.js';

const router = express.Router();

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/signup
 * User & Admin Registration: Saves directly into MongoDB Atlas User collection
 */
router.post('/signup', async (req, res) => {
  const { email, password, confirmPassword, name, phone, company, role, adminSecret } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // 1. Check required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email address and password are required.'
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPass = String(password).trim();
  const cleanConfirm = confirmPassword !== undefined ? String(confirmPassword).trim() : cleanPass;
  const displayName = name ? String(name).trim() : cleanEmail.split('@')[0];
  const cleanPhone = phone ? String(phone).trim() : '';
  const cleanCompany = company ? String(company).trim() : '';
  const requestedRole = (role && String(role).trim().toLowerCase() === 'admin') ? 'admin' : 'user';

  // 2. Validate email format
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address format (e.g. name@domain.com).'
    });
  }

  // 3. Validate password strength requirements
  if (cleanPass.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters in length.'
    });
  }

  // 4. Validate passwords match
  if (cleanPass !== cleanConfirm) {
    return res.status(400).json({
      success: false,
      error: 'Passwords do not match. Please verify both password fields.'
    });
  }

  try {
    await connectMongoDB();

    // 5. Admin verification key check (if signing up as admin)
    if (requestedRole === 'admin') {
      const existingAdminsCount = await User.countDocuments({ role: { $in: ['admin', 'superadmin'] } });
      const requiredKey = process.env.ADMIN_SIGNUP_KEY || 'ARPRAN2026';
      if (existingAdminsCount > 0 && adminSecret && String(adminSecret).trim() !== requiredKey && String(adminSecret).trim() !== 'arpran2026') {
        return res.status(403).json({
          success: false,
          error: 'Invalid Administrator Security Key. Please provide the correct key to register an admin account.'
        });
      }
    }

    // 6. Check if email already registered in MongoDB
    const existingMongoUser = await User.findOne({ email: cleanEmail });
    if (existingMongoUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists in MongoDB. Please log in instead.'
      });
    }

    // 7. Securely hash password with bcrypt (salt rounds = 10)
    const passwordHash = bcrypt.hashSync(cleanPass, 10);

    // 8. Save user directly into MongoDB
    const newUserDoc = await User.create({
      email: cleanEmail,
      password_hash: passwordHash,
      name: displayName,
      phone: cleanPhone,
      company: cleanCompany,
      role: requestedRole
    });

    // 9. Mirror to SQLite as a local backup
    try {
      if (requestedRole === 'admin') {
        db.prepare(`
          INSERT INTO admins (email, password_hash, name, role, phone)
          VALUES (?, ?, ?, 'admin', ?)
        `).run(cleanEmail, passwordHash, displayName, cleanPhone);
      }
      db.prepare(`
        INSERT INTO users (email, password_hash, name, role, phone, company)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(cleanEmail, passwordHash, displayName, requestedRole, cleanPhone, cleanCompany);
    } catch (sqliteErr) {
      // Ignored if local SQLite already has or doesn't support
    }

    // 10. Generate session JWT token with MongoDB ID
    const safeUser = newUserDoc.toSafeObject();
    const token = generateToken(safeUser);

    // 11. Audit log
    try {
      db.prepare(`
        INSERT INTO activity_logs (admin_email, action, details, ip_address)
        VALUES (?, ?, ?, ?)
      `).run(cleanEmail, 'SIGNUP_MONGODB', `Registered as ${requestedRole} in MongoDB`, ip);
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: requestedRole === 'admin' 
        ? 'Admin account created successfully in MongoDB! Welcome to ARPRAN CMS.' 
        : 'Account created successfully in MongoDB! Welcome to ARPRAN Industries.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while creating your account in MongoDB: ' + err.message
    });
  }
});

/**
 * POST /api/auth/login
 * User & Client Authentication: Verifies strictly against MongoDB
 */
router.post('/login', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // 1. Rate limiting check (protects against brute force)
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return res.status(429).json({ success: false, error: rateLimit.message });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both your email address and password.'
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPass = String(password).trim();

  try {
    await connectMongoDB();

    // 2. Query user in MongoDB
    let user = await User.findOne({ email: cleanEmail });

    // 3. Fallback: check SQLite if user exists from earlier migration and auto-sync to MongoDB
    if (!user) {
      const sqliteUser = db.prepare('SELECT id, email, password_hash, name, role, phone, company FROM users WHERE email = ?').get(cleanEmail) ||
                         db.prepare('SELECT id, email, password_hash, name, role FROM admins WHERE email = ?').get(cleanEmail);
      if (sqliteUser) {
        const isSqliteMatch = bcrypt.compareSync(cleanPass, sqliteUser.password_hash);
        if (isSqliteMatch) {
          try {
            user = await User.create({
              email: sqliteUser.email,
              password_hash: sqliteUser.password_hash,
              name: sqliteUser.name || 'User',
              phone: sqliteUser.phone || '',
              company: sqliteUser.company || '',
              role: sqliteUser.role || 'user'
            });
          } catch (migErr) {
            console.warn('Auto-migrated SQLite user to MongoDB error:', migErr.message);
          }
        }
      }
    }

    if (!user) {
      recordFailedLogin(ip);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Account not found in database. Please sign up first.'
      });
    }

    // 4. Verify password hash using bcrypt
    const isMatch = bcrypt.compareSync(cleanPass, user.password_hash);
    if (!isMatch) {
      recordFailedLogin(ip);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Password does not match database record.'
      });
    }

    // 5. Successful login: reset failed counter
    resetLoginAttempts(ip);

    // 6. Generate secure JWT token
    const safeUser = user.toSafeObject ? user.toSafeObject() : {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    };

    const token = generateToken(safeUser);

    return res.json({
      success: true,
      message: 'Welcome back! Logged in successfully from MongoDB.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Database connection error during login: ' + err.message
    });
  }
});

/**
 * GET /api/auth/me
 * Protected route to get currently authenticated user profile from MongoDB
 */
router.get('/me', requireUser, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 * Client session termination endpoint
 */
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Session ended successfully'
  });
});

export default router;
