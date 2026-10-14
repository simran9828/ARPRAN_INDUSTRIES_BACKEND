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
 * User Registration with validation & duplicate prevention
 */
router.post('/signup', (req, res) => {
  const { email, password, confirmPassword, name } = req.body;

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

  // 5. Prevent duplicate accounts with same email
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'An account with this email address already exists. Please log in instead.'
    });
  }

  try {
    // 6. Securely hash password with bcrypt (salt rounds = 10)
    const passwordHash = bcrypt.hashSync(cleanPass, 10);

    // 7. Insert new user into database
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'user')
    `).run(cleanEmail, passwordHash, displayName);

    const newUserId = result.lastInsertRowid;
    const newUser = {
      id: newUserId,
      email: cleanEmail,
      name: displayName,
      role: 'user'
    };

    // 8. Generate session JWT token
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to ARPRAN Industries.',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while creating your account. Please try again.'
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
