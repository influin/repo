const express = require('express');
const router = express.Router();
// Import the new controller functions
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
  updateUserRoles,
  setUserType,           // New function
  setUserRoles,          // New function
  completeRegistration,  // New function
  setUserTypeAndRoles    // Keep for backward compatibility
} = require('../controllers/userController');
const { protectUser } = require('../middleware/userAuth');
const { uploadImage } = require('../../config/cloudinary');

// Configure upload middleware for profile image
const uploadProfileImage = uploadImage.single('profileImage');

// OTP routes
router.post('/send-otp', sendOTPController);
router.post('/verify-otp', verifyOTPController);

// Multi-step registration routes
router.post('/set-user-type', setUserType);                // Step 2: Set user type
router.post('/set-user-roles', setUserRoles);              // Step 3: Set user roles
router.post('/complete-registration', uploadProfileImage, completeRegistration); // Step 4: Complete registration

// Keep existing routes for backward compatibility
router.post('/set-user-type-and-roles', setUserTypeAndRoles); // Combined step 2 & 3
router.post('/register', uploadProfileImage, registerUser);    // Single-step registration

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