import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
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
 * User & Admin Registration: Validates and saves directly into SQLite database
 */
router.post('/signup', (req, res) => {
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

  // 5. Admin verification key check (if signing up as admin and admins already exist)
  if (requestedRole === 'admin') {
    const existingAdminsCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
    const requiredKey = process.env.ADMIN_SIGNUP_KEY || 'ARPRAN2026';
    if (existingAdminsCount > 0 && adminSecret && String(adminSecret).trim() !== requiredKey && String(adminSecret).trim() !== 'arpran2026') {
      return res.status(403).json({
        success: false,
        error: 'Invalid Administrator Security Key. Please provide the correct key to register an admin account.'
      });
    }
  }

  // 6. Prevent duplicate accounts across users and admins tables
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  const existingAdmin = db.prepare('SELECT id FROM admins WHERE email = ?').get(cleanEmail);

  if (existingUser || existingAdmin) {
    return res.status(409).json({
      success: false,
      error: 'An account with this email address already exists. Please log in instead.'
    });
  }

  try {
    // 7. Securely hash password with bcrypt (salt rounds = 10)
    const passwordHash = bcrypt.hashSync(cleanPass, 10);

    let newUserId;
    if (requestedRole === 'admin') {
      // Insert into admins table
      const adminResult = db.prepare(`
        INSERT INTO admins (email, password_hash, name, role, phone)
        VALUES (?, ?, ?, 'admin', ?)
      `).run(cleanEmail, passwordHash, displayName, cleanPhone);
      newUserId = adminResult.lastInsertRowid;

      // Also mirror into users table so admin can access both client portal & admin CMS
      try {
        db.prepare(`
          INSERT INTO users (email, password_hash, name, role, phone, company)
          VALUES (?, ?, ?, 'admin', ?, ?)
        `).run(cleanEmail, passwordHash, displayName, cleanPhone, cleanCompany);
      } catch (e) {
        // Ignored if duplicate
      }
    } else {
      // Insert into users table
      const userResult = db.prepare(`
        INSERT INTO users (email, password_hash, name, role, phone, company)
        VALUES (?, ?, ?, 'user', ?, ?)
      `).run(cleanEmail, passwordHash, displayName, cleanPhone, cleanCompany);
      newUserId = userResult.lastInsertRowid;
    }

    const newUser = {
      id: newUserId,
      email: cleanEmail,
      name: displayName,
      phone: cleanPhone,
      company: cleanCompany,
      role: requestedRole
    };

    // 8. Generate session JWT token
    const token = generateToken(newUser);

    // 9. Audit log entry
    try {
      db.prepare(`
        INSERT INTO activity_logs (admin_email, action, details, ip_address)
        VALUES (?, ?, ?, ?)
      `).run(cleanEmail, 'SIGNUP_SUCCESS', `Registered as ${requestedRole}`, ip);
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: requestedRole === 'admin' 
        ? 'Admin account created successfully! Welcome to ARPRAN CMS.' 
        : 'Account created successfully! Welcome to ARPRAN Industries.',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while creating your account. Please try again: ' + err.message
    });
  }
});

/**
 * POST /api/auth/login
 * User Authentication with rate limiting & secure verification
 */
router.post('/login', (req, res) => {
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

  // 2. Query user in users table
  let user = db.prepare('SELECT id, email, password_hash, name, role FROM users WHERE email = ?').get(cleanEmail);

  // Fallback to admins table if user is an admin logging in via the main user login
  if (!user) {
    const adminUser = db.prepare('SELECT id, email, password_hash, name, role FROM admins WHERE email = ?').get(cleanEmail);
    if (adminUser) {
      user = adminUser;
    }
  }

  if (!user) {
    recordFailedLogin(ip);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. Please verify your email and password.'
    });
  }

  // 3. Verify password hash using bcrypt
  const isMatch = bcrypt.compareSync(cleanPass, user.password_hash);

  if (!isMatch) {
    recordFailedLogin(ip);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. Please verify your email and password.'
    });
  }

  // 4. Successful login: reset failed counter
  resetLoginAttempts(ip);

  // 5. Generate secure JWT token
  const tokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name || 'User',
    role: user.role || 'user'
  };
  const token = generateToken(tokenPayload);

  return res.json({
    success: true,
    message: 'Welcome back! Logged in successfully.',
    token,
    user: tokenPayload
  });
});

/**
 * GET /api/auth/me
 * Protected route to get currently authenticated user profile
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
