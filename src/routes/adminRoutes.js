const express = require('express');
const router = express.Router();
const { 
  registerAdmin, 
  loginAdmin, 
  getAdminProfile, 
  updateAdminProfile, 
  getAdmins, 
  updateAdminStatus, 
  deleteAdmin 
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/login', loginAdmin);

// Protected routes
router.get('/profile', protect, getAdminProfile);
router.put('/profile', protect, updateAdminProfile);

// SuperAdmin only routes
router.post('/register', protect, authorize('superadmin'), registerAdmin);
router.get('/', protect, authorize('superadmin'), getAdmins);
router.put('/:id/status', protect, authorize('superadmin'), updateAdminStatus);
router.delete('/:id', protect, authorize('superadmin'), deleteAdmin);

module.exports = router;