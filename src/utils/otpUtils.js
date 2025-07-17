const axios = require('axios');
const OTP = require('../models/OTP');

// Generate a random 6-digit OTP
exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Fast2SMS
exports.sendOTP = async (phoneNumber, otp) => {
  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'otp',
      variables_values: otp,
      numbers: phoneNumber,
    }, {
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP');
  }
};

// Save OTP to database
exports.saveOTP = async (phoneNumber, otp) => {
  try {
    // Delete any existing OTPs for this phone number
    await OTP.deleteMany({ phoneNumber });
    
    // Create new OTP record
    const otpRecord = await OTP.create({
      phoneNumber,
      otp
    });
    
    return otpRecord;
  } catch (error) {
    console.error('Error saving OTP:', error);
    throw new Error('Failed to save OTP');
  }
};

// Verify OTP
exports.verifyOTP = async (phoneNumber, otp) => {
  try {
    const otpRecord = await OTP.findOne({ phoneNumber, otp });
    
    if (!otpRecord) {
      return false;
    }
    
    // Delete the OTP record after verification
    await OTP.deleteOne({ _id: otpRecord._id });
    
    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw new Error('Failed to verify OTP');
  }
};