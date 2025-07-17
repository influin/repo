const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const updateUsersWithFreePlan = async () => {
  try {
    // Find the Free Plan
    const freePlan = await SubscriptionPlan.findOne({ name: 'Free Plan' });
    
    if (!freePlan) {
      console.error('Free Plan not found. Please run createFreePlan.js first.');
      process.exit(1);
    }
    
    // Calculate end date (6 months from now)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + freePlan.durationInMonths);
    
    // Find all users who don't have a subscription plan
    const usersToUpdate = await User.find({
      $or: [
        { 'subscription.plan': { $exists: false } },
        { 'subscription.plan': null }
      ]
    });
    
    console.log(`Found ${usersToUpdate.length} users without a subscription plan`);
    
    // Update each user with the Free Plan
    let updatedCount = 0;
    for (const user of usersToUpdate) {
      user.subscription = {
        plan: freePlan._id,
        startDate: startDate,
        endDate: endDate,
        isActive: true,
        paymentStatus: 'Completed',
        autoRenew: false
      };
      
      await user.save();
      updatedCount++;
      
      // Log progress every 10 users
      if (updatedCount % 10 === 0) {
        console.log(`Updated ${updatedCount} users so far...`);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} users with the Free Plan subscription`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating users with Free Plan:', error);
    process.exit(1);
  }
};

updateUsersWithFreePlan();