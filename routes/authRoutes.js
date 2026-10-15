import express from 'express';
import db, { dbPath } from '../database.js';
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
 * Admin Login: Authenticates against MongoDB User collection (admin role)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const result = await authenticateAdminFromDB(email, password);

    if (!result.success) {
      logActivity(email || 'unknown', 'Failed Admin Login Attempt', `Reason: ${result.error}`, ip);
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    logActivity(result.admin.email, 'Admin Login', 'Logged in via MongoDB credentials', ip);

    return res.json({
      success: true,
      message: 'Logged in successfully from MongoDB.',
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
 * Updates password directly in MongoDB after verifying current password.
 */
router.post('/change-password', requireAdmin, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are both required.'
      });
    }

    if (String(newPassword).trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters in length.'
      });
    }

    const adminId = req.admin.id || req.admin._id;
    const result = await updateAdminPasswordInDB(adminId, oldPassword, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logActivity(req.admin.email, 'Admin Password Changed', 'Password updated in MongoDB', ip);

    return res.json({
      success: true,
      message: 'Admin password successfully updated in MongoDB!'
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
 * Updates admin email directly in MongoDB
 */
router.post('/update-email', requireAdmin, async (req, res) => {
  try {
    const { newEmail, name } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!newEmail || !String(newEmail).includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    const adminId = req.admin.id || req.admin._id;
    const result = await updateAdminEmailInDB(adminId, newEmail, name);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logActivity(req.admin.email, 'Admin Email Updated', `Email changed to ${newEmail} in MongoDB`, ip);

    return res.json({
      success: true,
      message: 'Admin email updated successfully in MongoDB!',
      email: result.email
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Email update error: ' + err.message
    });
  }
});

export default router;
