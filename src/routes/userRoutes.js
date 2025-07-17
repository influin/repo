const express = require('express');
const router = express.Router();
// Import the new controller function
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  sendOTPController,
  verifyOTPController,
  checkUsername,
  deleteUserAccount,
  setUsername,
  updateUserRoles  // Add this line
} = require('../controllers/userController');
const { protectUser } = require('../middleware/userAuth');
const { uploadImage } = require('../../config/cloudinary');

// Configure upload middleware for profile image
const uploadProfileImage = uploadImage.single('profileImage');

// OTP routes
router.post('/send-otp', sendOTPController);
router.post('/verify-otp', verifyOTPController);

// Username availability check
router.get('/check-username/:username', checkUsername);

// Public routes
router.post('/register', uploadProfileImage, registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', protectUser, getUserProfile);
router.put('/profile', protectUser, uploadProfileImage, updateUserProfile);
router.delete('/profile', protectUser, deleteUserAccount);

// New route for setting username
router.put('/set-username', protectUser, setUsername);

// Add this new route
router.put('/roles', protectUser, updateUserRoles);

module.exports = router;