const express = require('express');
const router = express.Router();
const {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  getSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  toggleSubscriptionPlanStatus
} = require('../controllers/subscriptionPlanController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected and require admin authentication
router.use(protect);

// Routes accessible by all admin roles
router.get('/', getAllSubscriptionPlans);
router.get('/:id', getSubscriptionPlan);

// Routes restricted to superadmin and finance roles
router.post('/', authorize('superadmin', 'finance'), createSubscriptionPlan);
router.put('/:id', authorize('superadmin', 'finance'), updateSubscriptionPlan);
router.delete('/:id', authorize('superadmin'), deleteSubscriptionPlan);
router.put('/:id/toggle-status', authorize('superadmin', 'finance'), toggleSubscriptionPlanStatus);

module.exports = router;