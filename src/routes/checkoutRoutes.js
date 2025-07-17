const express = require('express');
const router = express.Router();
const { 
  createCheckoutSession,
  getCheckoutSession,
  getCheckoutHistory
} = require('../controllers/checkoutController');
const { protectUser } = require('../middleware/userAuth');

// All routes are protected
router.use(protectUser);

// Checkout routes
router.post('/', createCheckoutSession);
router.get('/history', getCheckoutHistory);
router.get('/:id', getCheckoutSession);

module.exports = router;