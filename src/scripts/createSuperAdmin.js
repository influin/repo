const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const connectDB = require('../../config/db');

// Import Admin model
const Admin = require('../models/Admin');

// Connect to database
connectDB();

const createSuperAdmin = async () => {
  try {
    // Check if superadmin already exists
    const superAdminExists = await Admin.findOne({ role: 'superadmin' });
    
    if (superAdminExists) {
      console.log('A superadmin already exists in the database');
      process.exit(0);
    }
    
    // Create superadmin credentials
    const email = 'superadmin@example.com';
    const password = 'superadmin123'; // This should be changed immediately after first login
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create superadmin
    const superAdmin = await Admin.create({
      email,
      passwordHash,
      name: 'Super Admin',
      role: 'superadmin',
      isActive: true
    });
    
    console.log('Superadmin created successfully:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('Please change this password immediately after first login');
    
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

createSuperAdmin();