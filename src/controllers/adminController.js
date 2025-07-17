const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new admin (only superadmin can do this)
// @route   POST /api/admin/register
// @access  Private/SuperAdmin
exports.registerAdmin = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Check if admin already exists
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create admin
    const admin = await Admin.create({
      email,
      passwordHash,
      name,
      role: role || 'moderator'
    });
    
    if (admin) {
      res.status(201).json({
        success: true,
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'This admin account has been deactivated' });
    }
    
    // Check if password matches
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Update last login
    admin.lastLogin = Date.now();
    await admin.save();
    
    res.status(200).json({
      success: true,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token: generateToken(admin._id)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-passwordHash');
    if (admin) {
      res.status(200).json({
        success: true,
        admin
      });
    } else {
      res.status(404).json({ success: false, message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private
exports.updateAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    
    if (admin) {
      admin.name = req.body.name || admin.name;
      admin.email = req.body.email || admin.email;
      
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        admin.passwordHash = await bcrypt.hash(req.body.password, salt);
      }
      
      const updatedAdmin = await admin.save();
      
      res.status(200).json({
        success: true,
        admin: {
          _id: updatedAdmin._id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          role: updatedAdmin.role
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all admins
// @route   GET /api/admin
// @access  Private/SuperAdmin
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-passwordHash');
    res.status(200).json({
      success: true,
      count: admins.length,
      admins
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update admin status (activate/deactivate)
// @route   PUT /api/admin/:id/status
// @access  Private/SuperAdmin
exports.updateAdminStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    // Prevent deactivating yourself
    if (admin._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }
    
    admin.isActive = req.body.isActive;
    await admin.save();
    
    res.status(200).json({
      success: true,
      message: `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admin/:id
// @access  Private/SuperAdmin
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    // Prevent deleting yourself
    if (admin._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    
    await admin.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};