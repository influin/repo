const SubscriptionPlan = require('../models/SubscriptionPlan');

// @desc    Create a new subscription plan
// @route   POST /api/admin/subscription-plans
// @access  Private (Admin only)
exports.createSubscriptionPlan = async (req, res) => {
  try {
    const { name, price, billingCycle, features, durationInMonths } = req.body;

    // Validate required fields
    if (!name || price === undefined || !billingCycle || !features || !durationInMonths) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Create new subscription plan
    const subscriptionPlan = await SubscriptionPlan.create({
      name,
      price,
      billingCycle,
      features,
      durationInMonths,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: subscriptionPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all subscription plans
// @route   GET /api/admin/subscription-plans
// @access  Private (Admin only)
exports.getAllSubscriptionPlans = async (req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find().sort({ price: 1 });

    res.status(200).json({
      success: true,
      count: subscriptionPlans.length,
      data: subscriptionPlans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all active subscription plans (public)
// @route   GET /api/subscription-plans
// @access  Public
exports.getActiveSubscriptionPlans = async (req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });

    res.status(200).json({
      success: true,
      count: subscriptionPlans.length,
      data: subscriptionPlans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single subscription plan
// @route   GET /api/admin/subscription-plans/:id
// @access  Private (Admin only)
exports.getSubscriptionPlan = async (req, res) => {
  try {
    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

    if (!subscriptionPlan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subscriptionPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update subscription plan
// @route   PUT /api/admin/subscription-plans/:id
// @access  Private (Admin only)
exports.updateSubscriptionPlan = async (req, res) => {
  try {
    let subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

    if (!subscriptionPlan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    subscriptionPlan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: subscriptionPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete subscription plan
// @route   DELETE /api/admin/subscription-plans/:id
// @access  Private (Admin only)
exports.deleteSubscriptionPlan = async (req, res) => {
  try {
    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

    if (!subscriptionPlan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    await subscriptionPlan.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Subscription plan deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle subscription plan active status
// @route   PUT /api/admin/subscription-plans/:id/toggle-status
// @access  Private (Admin only)
exports.toggleSubscriptionPlanStatus = async (req, res) => {
  try {
    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

    if (!subscriptionPlan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    subscriptionPlan.isActive = !subscriptionPlan.isActive;
    await subscriptionPlan.save();

    res.status(200).json({
      success: true,
      data: subscriptionPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to get Free Plan (can be used by other controllers)
exports.getFreePlan = async () => {
  try {
    const freePlan = await SubscriptionPlan.findOne({ name: 'Free Plan', isActive: true });
    return freePlan;
  } catch (error) {
    console.error('Error fetching Free Plan:', error);
    return null;
  }
};