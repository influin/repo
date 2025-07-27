const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP, saveOTP, verifyOTP } = require('../utils/otpUtils');
const axios = require('axios');
const { cloudinary } = require('../../config/cloudinary');
const SubscriptionPlan = require('../models/SubscriptionPlan'); // Add this line

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Send OTP for authentication
// @route   POST /api/users/send-otp
// @access  Public
exports.sendOTPController = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Send OTP via Fast2SMS
    const smsResponse = await sendOTP(phoneNumber, otp);
    
    // Save OTP to database
    await saveOTP(phoneNumber, otp);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phoneNumber
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify OTP and register/login user
// @route   POST /api/users/verify-otp
// @access  Public
exports.verifyOTPController = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
    }
    
    // Verify OTP
    const isValid = await verifyOTP(phoneNumber, otp);
    
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    
    // Check if user exists
    let user = await User.findOne({ phoneNumber });
    
    if (user) {
      // Existing user - generate token and return user data
      const token = generateToken(user._id);
      
      return res.status(200).json({
        success: true,
        isNewUser: false,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          username: user.username,
          roles: user.roles,
          status: user.status
        },
        token
      });
    } else {
      // New user - return success with isNewUser flag
      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: 'OTP verified successfully. Please complete registration with basic info.',
        data: {
          phoneNumber
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register a new user after OTP verification
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, phoneNumber, password, gender, dob, userType, userRoles } = req.body;
    
    // Check if phone number is provided
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    
    // Check if required fields are provided
    if (!gender || !dob || !userType || !userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
      return res.status(400).json({ success: false, message: 'Gender, date of birth, user type, and at least one user role are required' });
    }
    
    // Check if user with this phone number already exists
    const phoneExists = await User.findOne({ phoneNumber });
    if (phoneExists) {
      return res.status(400).json({ success: false, message: 'User with this phone number already exists' });
    }
    
    // Check if email is provided and if it already exists
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'User with this email already exists' });
      }
    }
    
    // Find the Free Plan subscription
    const freePlan = await SubscriptionPlan.findOne({ name: 'Free Plan', isActive: true });
    if (!freePlan) {
      return res.status(500).json({ success: false, message: 'Free Plan not found. Please contact administrator.' });
    }
    
    // Calculate subscription end date based on plan duration
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + freePlan.durationInMonths);
    
    // Map userRoles to roles array
    const rolesMap = {
      'Store Owner': 'Seller',
      'Service Business Owner': 'Service Provider',
      'Course Provider': 'Tutor',
      'Influencer or Content Creator': 'Influencer',
      'Student or Working Professional': 'user',
      'Delivery Partner': 'user'
    };
    
    // Convert userRoles to system roles, removing duplicates
    const systemRoles = [...new Set(userRoles.map(role => rolesMap[role] || 'user'))];
    
    // Create user data object
    const userData = {
      name: name || 'User', // Default name if not provided
      phoneNumber,
      gender,
      dob,
      userType,
      userRoles,
      roles: systemRoles, // Map userRoles to system roles
      subscription: {
        plan: freePlan._id,
        startDate,
        endDate,
        isActive: true,
        paymentStatus: 'Completed', // Free plan doesn't require payment
        autoRenew: false
      }
    };
    
    // Add optional fields if provided
    if (email) userData.email = email;
    
    // Add password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      userData.passwordHash = await bcrypt.hash(password, salt);
    }
    
    // Handle profile image upload if provided in request
    if (req.file && req.file.path) {
      userData.profileURL = req.file.path;
    }
    
    // Create user
    const user = await User.create(userData);
    
    if (user) {
      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          gender: user.gender,
          dob: user.dob,
          userType: user.userType,
          userRoles: user.userRoles,
          roles: user.roles,
          status: user.status,
          subscription: {
            plan: freePlan.name,
            endDate: user.subscription.endDate
          }
        },
        token: generateToken(user._id)
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check username availability
// @route   GET /api/users/check-username/:username
// @access  Public
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    
    const usernameExists = await User.findOne({ username });
    
    res.status(200).json({
      success: true,
      available: !usernameExists
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    User login with email/username and password
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { login, password } = req.body;
    
    // Check if login and password are provided
    if (!login || !password) {
      return res.status(400).json({ success: false, message: 'Please provide login credentials and password' });
    }
    
    // Find user by email, username, or phone number
    const user = await User.findOne({
      $or: [
        { email: login },
        { username: login },
        { phoneNumber: login }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'This account has been deactivated or banned' });
    }
    
    // Check if password matches
    if (!user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Please login with OTP' });
    }
    
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        username: user.username,
        roles: user.roles,
        status: user.status
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (user) {
      res.status(200).json({
        success: true,
        user
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      // Check if username is being updated and if it's already taken
      if (req.body.username && req.body.username !== user.username) {
        const usernameExists = await User.findOne({ username: req.body.username });
        if (usernameExists) {
          return res.status(400).json({ success: false, message: 'Username is already taken' });
        }
      }
      
      // Check if email is being updated and if it's already taken
      if (req.body.email && req.body.email !== user.email) {
        const emailExists = await User.findOne({ email: req.body.email });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'Email is already taken' });
        }
      }
      
      // Update basic info
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.username = req.body.username || user.username;
      user.gender = req.body.gender || user.gender;
      user.dob = req.body.dob || user.dob;
      user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
      
      // Handle profile image update if provided
      if (req.file && req.file.path) {
        // Delete old profile image from Cloudinary if exists
        if (user.profileURL && user.profileURL.includes('cloudinary')) {
          const publicId = user.profileURL.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        }
        
        user.profileURL = req.file.path;
      }
      
      // Update password if provided
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(req.body.password, salt);
      }
      
      const updatedUser = await user.save();
      
      res.status(200).json({
        success: true,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          username: updatedUser.username,
          gender: updatedUser.gender,
          dob: updatedUser.dob,
          phoneNumber: updatedUser.phoneNumber,
          profileURL: updatedUser.profileURL,
          roles: updatedUser.roles,
          status: updatedUser.status
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/profile
// @access  Private
exports.deleteUserAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Delete profile image from Cloudinary if exists
    if (user.profileURL && user.profileURL.includes('cloudinary')) {
      const publicId = user.profileURL.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }
    
    // Delete user
    await user.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'User account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set username for a new user
// @route   PUT /api/users/set-username
// @access  Private
exports.setUsername = async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if username is already taken
    const usernameExists = await User.findOne({ username, _id: { $ne: user._id } });
    if (usernameExists) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }
    
    // Update username
    user.username = username;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Username set successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        username: user.username,
        gender: user.gender,
        dob: user.dob,
        roles: user.roles,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user roles
// @route   PUT /api/users/roles
// @access  Private
exports.updateUserRoles = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      // Map userRoles to roles array
      const rolesMap = {
        'Store Owner': 'Seller',
        'Service Business Owner': 'Service Provider',
        'Course Provider': 'Tutor',
        'Influencer or Content Creator': 'Influencer',
        'Student or Working Professional': 'user',
        'Delivery Partner': 'user'
      };
      
      // Update userRoles if provided
      if (req.body.userRoles && Array.isArray(req.body.userRoles)) {
        user.userRoles = req.body.userRoles;
        
        // Convert userRoles to system roles, removing duplicates
        const systemRoles = [...new Set(req.body.userRoles.map(role => rolesMap[role] || 'user'))];
        user.roles = systemRoles;
      } 
      // For backward compatibility, still support direct roles update
      else if (req.body.roles) {
        user.roles = req.body.roles;
      }
      
      const updatedUser = await user.save();
      
      res.status(200).json({
        success: true,
        message: 'User roles updated successfully',
        userRoles: updatedUser.userRoles,
        roles: updatedUser.roles
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set user type after OTP verification
// @route   POST /api/users/set-user-type
// @access  Public
exports.setUserType = async (req, res) => {
  try {
    const { phoneNumber, userType } = req.body;
    
    if (!phoneNumber || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number and user type are required' 
      });
    }
    
    // Validate user type
    if (!['Individual', 'Organisation'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be either "Individual" or "Organisation"'
      });
    }
    
    // Generate a temporary token that will be used for the next step
    const tempToken = jwt.sign(
      { 
        phoneNumber, 
        userType,
        step: 'user-type',
        isRegistrationToken: true 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      success: true,
      message: 'User type set successfully',
      tempToken,
      data: {
        phoneNumber,
        userType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set user type and roles after OTP verification
// @route   POST /api/users/set-user-type
// @access  Public
exports.setUserTypeAndRoles = async (req, res) => {
  try {
    const { phoneNumber, userType, userRoles } = req.body;
    
    if (!phoneNumber || !userType || !userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number, user type, and at least one user role are required' 
      });
    }
    
    // Map userRoles to roles array
    const rolesMap = {
      'Store Owner': 'Seller',
      'Service Business Owner': 'Service Provider',
      'Course Provider': 'Tutor',
      'Influencer or Content Creator': 'Influencer',
      'Student or Working Professional': 'user',
      'Delivery Partner': 'user'
    };
    
    // Convert userRoles to system roles, removing duplicates
    const systemRoles = [...new Set(userRoles.map(role => rolesMap[role] || 'user'))];
    
    // Store the user type and roles in session or temporary storage
    // This will be used during the final registration step
    
    res.status(200).json({
      success: true,
      message: 'User type and roles set successfully',
      data: {
        phoneNumber,
        userType,
        userRoles,
        mappedRoles: systemRoles
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set user roles after setting user type
// @route   POST /api/users/set-user-roles
// @access  Public (with temporary token)
exports.setUserRoles = async (req, res) => {
  try {
    const { tempToken, userRoles } = req.body;
    
    if (!tempToken || !userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Temporary token and at least one user role are required' 
      });
    }
    
    // Verify and decode the temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      
      // Check if this is a registration token and the correct step
      if (!decoded.isRegistrationToken || decoded.step !== 'user-type') {
        return res.status(400).json({ success: false, message: 'Invalid registration token or sequence' });
      }
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    
    const { phoneNumber, userType } = decoded;
    
    // Validate user roles
    const validRoles = [
      'Store Owner', 
      'Service Business Owner', 
      'Course Provider', 
      'Influencer or Content Creator', 
      'Student or Working Professional', 
      'Delivery Partner'
    ];
    
    const invalidRoles = userRoles.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid user role(s): ${invalidRoles.join(', ')}`
      });
    }
    
    // Map userRoles to roles array
    const rolesMap = {
      'Store Owner': 'Seller',
      'Service Business Owner': 'Service Provider',
      'Course Provider': 'Tutor',
      'Influencer or Content Creator': 'Influencer',
      'Student or Working Professional': 'user',
      'Delivery Partner': 'user'
    };
    
    // Convert userRoles to system roles, removing duplicates
    const systemRoles = [...new Set(userRoles.map(role => rolesMap[role] || 'user'))];
    
    // Generate a new temporary token that includes the user roles
    const newTempToken = jwt.sign(
      { 
        phoneNumber, 
        userType, 
        userRoles,
        systemRoles,
        step: 'user-roles',
        isRegistrationToken: true 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      success: true,
      message: 'User roles set successfully',
      tempToken: newTempToken,
      data: {
        phoneNumber,
        userType,
        userRoles,
        mappedRoles: systemRoles
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Send OTP for Aadhaar verification
// @route   POST /api/users/verify-aadhaar/send-otp
// @access  Private
exports.sendAadhaarOTP = async (req, res) => {
  try {
    const { aadhaar_number } = req.body;

    if (!aadhaar_number) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aadhaar number is required' 
      });
    }

    const response = await axios.post(
      'https://api.sandbox.co.in/kyc/aadhaar/okyc/otp',
      {
        "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
        "aadhaar_number": aadhaar_number,
        "consent": "y",
        "reason": "KYC"
      },
      {
        headers: {
          'Authorization': process.env.SANDBOX_AUTH_TOKEN,
          'x-api-key': process.env.SANDBOX_API_KEY,
          'x-api-version': '1.0.0',
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: response.data
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.message || error.message 
    });
  }
};

// @desc    Verify Aadhaar OTP
// @route   POST /api/users/verify-aadhaar/verify-otp
// @access  Private
exports.verifyAadhaarOTP = async (req, res) => {
  try {
    const { reference_id, otp } = req.body;

    if (!reference_id || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reference ID and OTP are required' 
      });
    }

    // Call Sandbox API to verify OTP
    const response = await axios.post(
      'https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify',
      {
        "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
        "reference_id": reference_id,
        "otp": otp
      },
      {
        headers: {
          'Authorization': process.env.SANDBOX_AUTH_TOKEN,
          'x-api-key': process.env.SANDBOX_API_KEY,
          'x-api-version': '2.0',
          'Content-Type': 'application/json'
        }
      }
    );

    // Update user's Aadhaar verification status
    await User.findByIdAndUpdate(req.user._id, {
      'kyc.aadhaar.isVerified': true,
      'kyc.aadhaar.verificationStatus': 'verified',
      'kyc.aadhaar.verifiedAt': new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Aadhaar verified successfully',
      data: response.data
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.message || error.message 
    });
  }
};
exports.verifyPAN = async (req, res) => {
  try {
    const { pan, name_as_per_pan, date_of_birth } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!pan || !name_as_per_pan || !date_of_birth) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    // Call Sandbox PAN verification API
    const response = await axios.post(
      'https://api.sandbox.co.in/kyc/pan/verify',
      {
        "@entity": "in.co.sandbox.kyc.pan_verification.request",
        pan,
        name_as_per_pan,
        date_of_birth,
        consent: "y",
        reason: "KYC"
      },
      {
        headers: {
          'authorization': process.env.SANDBOX_AUTH_TOKEN,
          'x-api-key': process.env.SANDBOX_API_KEY,
          'x-accept-cache': 'true',
          'Content-Type': 'application/json'
        }
      }
    );

    // Update user's PAN verification status
    const user = await User.findById(userId);
    user.kyc.pan = {
      number: pan,
      name: name_as_per_pan,
      dateOfBirth: date_of_birth,
      isVerified: response.data.verified || false,
      verificationStatus: response.data.verified ? 'verified' : 'failed',
      verifiedAt: new Date()
    };
    await user.save();

    return res.status(200).json({
      success: true,
      message: "PAN verification completed",
      data: {
        pan: {
          isVerified: user.kyc.pan.isVerified,
          verificationStatus: user.kyc.pan.verificationStatus,
          verifiedAt: user.kyc.pan.verifiedAt
        }
      }
    });

  } catch (error) {
    console.error('PAN verification error:', error);
    return res.status(500).json({
      success: false,
      message: "PAN verification failed",
      error: error.response?.data?.message || error.message
    });
  }
};
// @desc    Complete user registration after setting user type and roles
// @route   POST /api/users/complete-registration
// @access  Public (with temporary token)
exports.completeRegistration = async (req, res) => {
  try {
    const { tempToken, name, email, password, gender, dob } = req.body;
    
    if (!tempToken) {
      return res.status(400).json({ success: false, message: 'Temporary token is required' });
    }
    
    // Verify and decode the temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      
      // Check if this is a registration token and the correct step
      if (!decoded.isRegistrationToken || decoded.step !== 'user-roles') {
        return res.status(400).json({ success: false, message: 'Invalid registration token or sequence' });
      }
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    
    const { phoneNumber, userType, userRoles, systemRoles } = decoded;
    
    // Check if required fields are provided
    if (!name || !gender || !dob) {
      return res.status(400).json({ success: false, message: 'Name, gender, and date of birth are required' });
    }
    
    // Check if user with this phone number already exists
    const phoneExists = await User.findOne({ phoneNumber });
    if (phoneExists) {
      return res.status(400).json({ success: false, message: 'User with this phone number already exists' });
    }
    
    // Check if email is provided and if it already exists
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'User with this email already exists' });
      }
    }
    
    // Find the Free Plan subscription
    const freePlan = await SubscriptionPlan.findOne({ name: 'Free Plan', isActive: true });
    if (!freePlan) {
      return res.status(500).json({ success: false, message: 'Free Plan not found. Please contact administrator.' });
    }
    
    // Calculate subscription end date based on plan duration
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + freePlan.durationInMonths);
    
    // Create user data object
    const userData = {
      name,
      phoneNumber,
      gender,
      dob,
      userType,
      userRoles,
      roles: systemRoles,
      subscription: {
        plan: freePlan._id,
        startDate,
        endDate,
        isActive: true,
        paymentStatus: 'Completed',
        autoRenew: false
      }
    };
    
    // Add optional fields if provided
    if (email) userData.email = email;
    
    // Add password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      userData.passwordHash = await bcrypt.hash(password, salt);
    }
    
    // Handle profile image upload if provided in request
    if (req.file && req.file.path) {
      userData.profileURL = req.file.path;
    }
    
    // Create user
    const user = await User.create(userData);
    
    if (user) {
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          gender: user.gender,
          dob: user.dob,
          userType: user.userType,
          userRoles: user.userRoles,
          roles: user.roles,
          status: user.status,
          subscription: {
            plan: freePlan.name,
            endDate: user.subscription.endDate
          }
        },
        token: generateToken(user._id)
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};