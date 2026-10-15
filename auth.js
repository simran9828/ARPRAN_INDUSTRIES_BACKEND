import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'arpran_super_secure_jwt_secret_key_2026';

/**
 * Generate a signed JWT token
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: requireAdmin
 * Strictly verifies JWT and validates admin directly against SQLite database `admins` or `users` table.
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token. Please log in again.'
    });
  }

  try {
    const admin = db.prepare('SELECT id, email, name, role FROM admins WHERE id = ?').get(decoded.id) ||
                  db.prepare('SELECT id, email, name, role FROM admins WHERE email = ?').get(decoded.email?.toLowerCase().trim()) ||
                  db.prepare("SELECT id, email, name, role FROM users WHERE id = ? AND (role = 'admin' OR role = 'superadmin')").get(decoded.id);

    if (!admin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin record not found in database.'
      });
    }

    req.admin = admin;
    req.user = admin;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Database error verifying admin credentials: ' + err.message
    });
  }
}

/**
 * Helper to log admin actions into the database activity_logs table
 */
export function logActivity(email, action, details = '', ip = '127.0.0.1') {
  try {
    db.prepare(`
      INSERT INTO activity_logs (admin_email, action, details, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(email, action, details, ip);
  } catch (err) {
    console.warn('Failed to record activity log:', err.message);
  }
}

/**
 * Authenticate admin directly from the database `admins` table.
 * Strictly verifies against bcrypt password hash stored in SQLite database.
 * No hardcoded default passwords.
 */
export function authenticateAdminFromDB(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    return { success: false, error: 'Email and password are required.' };
  }

  // 1. Query admin record from database `admins` table
  let admin = db.prepare(`
    SELECT id, email, password_hash, name, role
    FROM admins 
    WHERE email = ?
  `).get(cleanEmail);

  // If not found in admins table, also check users table with admin/superadmin role
  if (!admin) {
    const userAdmin = db.prepare(`
      SELECT id, email, password_hash, name, role
      FROM users
      WHERE email = ? AND (role = 'admin' OR role = 'superadmin')
    `).get(cleanEmail);
    if (userAdmin) {
      admin = userAdmin;
    }
  }

  if (!admin) {
    return { success: false, error: 'Admin account not found in database. Please sign up or verify email.' };
  }

  // 2. Compare password strictly with database password_hash
  const isMatch = bcrypt.compareSync(cleanPassword, admin.password_hash);

  if (!isMatch) {
    return { success: false, error: 'Invalid password. Credentials do not match database record.' };
  }

  // 3. Issue JWT token
  const token = generateToken({
    id: admin.id,
    email: admin.email,
    name: admin.name || 'Admin',
    role: admin.role || 'superadmin'
  });

  return {
    success: true,
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name || 'Admin',
      role: admin.role || 'superadmin'
    }
  };
}

/**
 * Update admin password in database.
 * No passwords stored in .env. Permanently locks default passwords.
 */
export function updateAdminPasswordInDB(adminId, oldPassword, newPassword) {
  // 1. Fetch current admin from DB
  const admin = db.prepare('SELECT id, email, password_hash FROM admins WHERE id = ?').get(adminId);
  if (!admin) {
    return { success: false, error: 'Admin account not found in database.' };
  }

  // 2. Verify old password strictly against database password_hash
  const isMatch = bcrypt.compareSync(String(oldPassword).trim(), admin.password_hash);
  if (!isMatch) {
    return { success: false, error: 'Current (old) password is incorrect in database.' };
  }

  // 3. Hash new password and update database record with permanent lock on default password
  const newHash = bcrypt.hashSync(String(newPassword).trim(), 10);
  
  db.prepare(`
    UPDATE admins
    SET password_hash = ?, 
        previous_password_hash = ?, 
        password_changed = 1,
        default_password_used = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newHash, admin.password_hash, admin.id);

  return {
    success: true,
    message: 'Admin password successfully updated in database!'
  };
}

/**
 * Update admin email in database
 */
export function updateAdminEmailInDB(adminId, newEmail, newName = null) {
  const cleanEmail = String(newEmail).trim().toLowerCase();

  // Check if new email is already used by another admin in DB
  const existing = db.prepare('SELECT id FROM admins WHERE email = ? AND id != ?').get(cleanEmail, adminId);
  if (existing) {
    return { success: false, error: 'This email is already registered to another admin in database.' };
  }

  if (newName) {
    db.prepare(`
      UPDATE admins
      SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanEmail, newName, adminId);
  } else {
    db.prepare(`
      UPDATE admins
      SET email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanEmail, adminId);
  }

  return {
    success: true,
    message: 'Admin email successfully updated in database!',
    email: cleanEmail
  };
}

// In-memory rate limiting map: IP -> { attempts: number, lockUntil: number }
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

/**
 * Rate limiting check for authentication attempts
 */
export function checkLoginRateLimit(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockUntil && record.lockUntil > now) {
    const minutesRemaining = Math.ceil((record.lockUntil - now) / 60000);
    return {
      allowed: false,
      message: `Too many failed login attempts. Please try again after ${minutesRemaining} minute(s).`
    };
  }

  // If lockout expired, reset
  if (record.lockUntil && record.lockUntil <= now) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt for an IP
 */
export function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, lockUntil: 0 };
  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_MS;
  }

  loginAttempts.set(ip, record);
}

/**
 * Reset failed login attempts on successful login
 */
export function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

/**
 * Middleware: requireUser
 * Verifies JWT for customer or admin user sessions
 */
export function requireUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token. Please log in again.'
    });
  }

  try {
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(decoded.id) ||
                 db.prepare('SELECT id, email, name, role FROM admins WHERE id = ?').get(decoded.id) ||
                 db.prepare('SELECT id, email, name, role FROM admins WHERE email = ?').get(decoded.email?.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Database error verifying session: ' + err.message
    });
  }
}

