import express from 'express';
import {
  authenticateAdminFromDB,
  updateAdminPasswordInDB,
  updateAdminEmailInDB,
  requireAdmin,
  logActivity
} from '../auth.js';

const router = express.Router();

/**
 * POST /api/admin/login
 * Admin Login: Authenticates strictly against database `admins` table.
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const result = authenticateAdminFromDB(email, password);

    if (!result.success) {
      logActivity(email || 'unknown', 'Failed Admin Login Attempt', `Reason: ${result.error}`, ip);
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    logActivity(result.admin.email, 'Admin Login', 'Logged in via Database credentials', ip);

    return res.json({
      success: true,
      message: 'Logged in successfully from database.',
      token: result.token,
      admin: result.admin
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error: ' + err.message
    });
  }
});

/**
 * GET /api/admin/me
 * Retrieves current admin profile from DB using valid JWT
 */
router.get('/me', requireAdmin, (req, res) => {
  return res.json({
    success: true,
    admin: req.admin
  });
});

/**
 * POST /api/admin/change-password
 * Updates password directly in database `admins` table after verifying current password.
 */
router.post('/change-password', requireAdmin, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password aur new password dono required hain.'
      });
    }

    if (String(newPassword).trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password kam se kam 6 characters ka hona chahiye.'
      });
    }

    const result = updateAdminPasswordInDB(req.admin.id, oldPassword, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logActivity(req.admin.email, 'Admin Password Changed', 'Password updated in database table `admins`', ip);

    return res.json({
      success: true,
      message: 'Admin password successfully updated in database!'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Password update error: ' + err.message
    });
  }
});

/**
 * POST /api/admin/update-email
 * Updates admin email directly in database `admins` table
 */
router.post('/update-email', requireAdmin, (req, res) => {
  try {
    const { newEmail, name } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!newEmail || !String(newEmail).includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    const result = updateAdminEmailInDB(req.admin.id, newEmail, name);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logActivity(newEmail, 'Admin Email Updated', `Changed from ${req.admin.email} to ${newEmail} in database`, ip);

    return res.json({
      success: true,
      message: 'Admin email successfully updated in database!',
      admin: {
        ...req.admin,
        email: result.email,
        name: name || req.admin.name
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Email update error: ' + err.message
    });
  }
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

export default router;
