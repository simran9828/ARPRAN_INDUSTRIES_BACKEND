import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './database.js';
import User from './models/User.js';
import { connectMongoDB } from './mongodb.js';

const JWT_SECRET = process.env.JWT_SECRET || 'arpran_production_grade_jwt_secret_key_9823472918347';

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
 * Strictly verifies JWT and validates admin directly against MongoDB (with SQLite fallback)
 */
export async function requireAdmin(req, res, next) {
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
    await connectMongoDB();
    let admin = null;

    // 1. Check in MongoDB
    if (decoded.id) {
      try {
        admin = await User.findById(decoded.id).select('-password_hash');
      } catch (e) {}
    }
    if (!admin && decoded.email) {
      admin = await User.findOne({ 
        email: decoded.email.toLowerCase().trim() 
      }).select('-password_hash');
    }

    // 2. Fallback check in SQLite if not yet migrated
    if (!admin) {
      const sqliteAdmin = db.prepare('SELECT id, email, name, role FROM admins WHERE id = ?').get(decoded.id) ||
                          db.prepare('SELECT id, email, name, role FROM admins WHERE email = ?').get(decoded.email?.toLowerCase().trim()) ||
                          db.prepare("SELECT id, email, name, role FROM users WHERE id = ? AND (role = 'admin' OR role = 'superadmin')").get(decoded.id);
      if (sqliteAdmin) {
        admin = sqliteAdmin;
      }
    }

    if (!admin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Administrator record not found.'
      });
    }

    const role = admin.role || 'user';
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Administrator privileges required.'
      });
    }

    const safeAdmin = admin.toSafeObject ? admin.toSafeObject() : admin;
    req.admin = safeAdmin;
    req.user = safeAdmin;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Database error verifying admin credentials: ' + err.message
    });
  }
}

/**
 * Middleware: requireUser
 * Verifies JWT for customer or admin user sessions against MongoDB
 */
export async function requireUser(req, res, next) {
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
    await connectMongoDB();
    let user = null;

    // 1. Check in MongoDB
    if (decoded.id) {
      try {
        user = await User.findById(decoded.id).select('-password_hash');
      } catch (e) {}
    }
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email.toLowerCase().trim() }).select('-password_hash');
    }

    // 2. Fallback check in SQLite
    if (!user) {
      const sqliteUser = db.prepare('SELECT id, email, name, role, phone, company FROM users WHERE id = ?').get(decoded.id) ||
                         db.prepare('SELECT id, email, name, role FROM admins WHERE id = ?').get(decoded.id) ||
                         db.prepare('SELECT id, email, name, role, phone, company FROM users WHERE email = ?').get(decoded.email?.toLowerCase().trim());
      if (sqliteUser) {
        user = sqliteUser;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found.'
      });
    }

    req.user = user.toSafeObject ? user.toSafeObject() : user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Database error verifying session: ' + err.message
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
 * Authenticate admin directly from MongoDB.
 * Strictly verifies against bcrypt password hash stored in MongoDB.
 */
export async function authenticateAdminFromDB(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    return { success: false, error: 'Email and password are required.' };
  }

  try {
    await connectMongoDB();

    // 1. Query MongoDB for admin account
    let admin = await User.findOne({
      email: cleanEmail,
      role: { $in: ['admin', 'superadmin'] }
    });

    // 2. Fallback: check SQLite admins table and auto-sync to MongoDB
    if (!admin) {
      const sqliteAdmin = db.prepare('SELECT id, email, password_hash, name, role FROM admins WHERE email = ?').get(cleanEmail);
      if (sqliteAdmin) {
        const isSqliteMatch = bcrypt.compareSync(cleanPassword, sqliteAdmin.password_hash);
        if (isSqliteMatch) {
          try {
            admin = await User.findOneAndUpdate(
              { email: cleanEmail },
              {
                email: cleanEmail,
                password_hash: sqliteAdmin.password_hash,
                name: sqliteAdmin.name || 'Admin',
                role: 'admin'
              },
              { upsert: true, new: true }
            );
          } catch (migErr) {
            console.warn('Auto-sync SQLite admin to MongoDB error:', migErr.message);
          }

          const token = generateToken({
            id: admin ? admin._id.toString() : sqliteAdmin.id,
            email: sqliteAdmin.email,
            name: sqliteAdmin.name || 'Admin',
            role: sqliteAdmin.role || 'superadmin'
          });

          return {
            success: true,
            token,
            admin: admin ? admin.toSafeObject() : sqliteAdmin
          };
        }
      }
    }

    if (!admin) {
      return { success: false, error: 'Administrator account not found in database. Please sign up or verify email.' };
    }

    // 3. Verify password hash using bcrypt
    const isMatch = bcrypt.compareSync(cleanPassword, admin.password_hash);
    if (!isMatch) {
      return { success: false, error: 'Invalid password. Credentials do not match database record.' };
    }

    // 4. Issue JWT token
    const token = generateToken({
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name || 'Admin',
      role: admin.role || 'superadmin'
    });

    return {
      success: true,
      token,
      admin: admin.toSafeObject()
    };
  } catch (err) {
    return { success: false, error: 'Database authentication error: ' + err.message };
  }
}

/**
 * Update admin password in MongoDB
 */
export async function updateAdminPasswordInDB(adminId, oldPassword, newPassword) {
  try {
    await connectMongoDB();
    let admin = null;
    try {
      admin = await User.findById(adminId);
    } catch (e) {}
    if (!admin) {
      admin = await User.findOne({ email: adminId });
    }

    if (admin) {
      const isMatch = bcrypt.compareSync(String(oldPassword).trim(), admin.password_hash);
      if (!isMatch) {
        return { success: false, error: 'Current (old) password is incorrect in database.' };
      }
      const newHash = bcrypt.hashSync(String(newPassword).trim(), 10);
      admin.password_hash = newHash;
      await admin.save();

      // Mirror in SQLite
      try {
        db.prepare('UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?').run(newHash, admin.email);
      } catch (e) {}

      return {
        success: true,
        message: 'Admin password successfully updated in MongoDB!'
      };
    }

    // SQLite fallback
    const sqliteAdmin = db.prepare('SELECT id, email, password_hash FROM admins WHERE id = ?').get(adminId);
    if (sqliteAdmin) {
      const isMatch = bcrypt.compareSync(String(oldPassword).trim(), sqliteAdmin.password_hash);
      if (!isMatch) {
        return { success: false, error: 'Current (old) password is incorrect in database.' };
      }
      const newHash = bcrypt.hashSync(String(newPassword).trim(), 10);
      db.prepare('UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, sqliteAdmin.id);
      return {
        success: true,
        message: 'Admin password successfully updated in database!'
      };
    }

    return { success: false, error: 'Admin account not found in database.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Update admin email in MongoDB
 */
export async function updateAdminEmailInDB(adminId, newEmail, newName = null) {
  const cleanEmail = String(newEmail).trim().toLowerCase();
  try {
    await connectMongoDB();
    const existing = await User.findOne({ email: cleanEmail, _id: { $ne: adminId } });
    if (existing) {
      return { success: false, error: 'This email is already registered to another account.' };
    }

    let admin = null;
    try {
      admin = await User.findById(adminId);
    } catch (e) {}
    if (!admin) {
      admin = await User.findOne({ email: adminId });
    }

    if (admin) {
      admin.email = cleanEmail;
      if (newName) admin.name = newName;
      await admin.save();

      // Mirror in SQLite
      try {
        db.prepare('UPDATE admins SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(cleanEmail, adminId);
      } catch (e) {}

      return {
        success: true,
        message: 'Admin email successfully updated in MongoDB!',
        email: cleanEmail
      };
    }

    return { success: false, error: 'Admin account not found in database.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// In-memory rate limiting map: IP -> { attempts: number, lockUntil: number }
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

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

  if (record.lockUntil && record.lockUntil <= now) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, lockUntil: 0 };
  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_MS;
  }

  loginAttempts.set(ip, record);
}

export function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}
