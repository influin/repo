const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const updateUsersWithWallet = async () => {
  try {
    // Find all users
    const users = await User.find({});
    
    console.log(`Found ${users.length} users to update with wallet`);
    
    // Update each user with wallet field
    let updatedCount = 0;
    for (const user of users) {
      // Check if user already has a wallet field
      if (!user.wallet) {
        // Add wallet field with initial values set to 0
        user.wallet = {
          balance: 0,
          pendingPayouts: 0,
          totalEarned: 0,
          totalPaidOut: 0,
          lastUpdated: new Date()
        };
        
        await user.save();
        updatedCount++;
      }
    }
    
    console.log(`Successfully updated ${updatedCount} users with wallet field`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating users with wallet:', error.message);
    process.exit(1);
  }
};

// Run the update function
updateUsersWithWallet();