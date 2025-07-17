const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTP, saveOTP, verifyOTP } = require('../utils/otpUtils');
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
    const { name, email, phoneNumber, password, gender, dob } = req.body;
    
    // Check if phone number is provided
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    
    // Check if required fields are provided
    if (!gender || !dob) {
      return res.status(400).json({ success: false, message: 'Gender and date of birth are required' });
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
      name: name || 'User', // Default name if not provided
      phoneNumber,
      gender,
      dob,
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
      // Update roles
      user.roles = req.body.roles || user.roles;
      
      const updatedUser = await user.save();
      
      res.status(200).json({
        success: true,
        message: 'User roles updated successfully',
        roles: updatedUser.roles
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};