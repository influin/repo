const mongoose = require('mongoose');
require('dotenv').config();
const SubscriptionPlan = require('../models/SubscriptionPlan');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const createFreePlan = async () => {
  try {
    // Check if Free Plan already exists
    const existingPlan = await SubscriptionPlan.findOne({ name: 'Free Plan' });
    
    if (existingPlan) {
      console.log('Free Plan already exists');
      process.exit(0);
    }
    
    // Create Free Plan
    const freePlan = await SubscriptionPlan.create({
      name: 'Free Plan',
      price: 0,
      billingCycle: 'one-time',
      features: ['Basic Access', 'View Products', 'View Services'],
      durationInMonths: 6,
      isActive: true
    });
    
    console.log('Free Plan created successfully:', freePlan);
    process.exit(0);
  } catch (error) {
    console.error('Error creating Free Plan:', error);
    process.exit(1);
  }
};

createFreePlan();