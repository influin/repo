const mongoose = require('mongoose');
const { Schema } = mongoose;

const OTPSchema = new Schema({
  phoneNumber: {
    type: String,
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // OTP expires after 10 minutes (600 seconds)
  }
});

module.exports = mongoose.model('OTP', OTPSchema);