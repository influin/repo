const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protectUser = async (req, res, next) => {
  try {
    let token;
    
    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'The user with this token no longer exists' });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'This user account has been deactivated or banned' });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

// Middleware to check user roles
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user.roles || !req.user.roles.some(role => roles.includes(role))) {
      return res.status(403).json({ 
        success: false, 
        message: `User does not have the required role(s) to access this route` 
      });
    }
    next();
  };
};