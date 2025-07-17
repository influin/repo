const express = require('express');
const router = express.Router();
const { getActiveSubscriptionPlans } = require('../controllers/subscriptionPlanController');

// Public route to get active subscription plans
router.get('/', getActiveSubscriptionPlans);

module.exports = router;