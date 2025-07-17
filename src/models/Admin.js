const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['superadmin', 'moderator', 'finance', 'support'],
    default: 'moderator'
  },
  name: String,
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);