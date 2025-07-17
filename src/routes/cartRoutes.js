const express = require('express');
const router = express.Router();
const { 
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { protectUser } = require('../middleware/userAuth');

// All routes are protected
router.use(protectUser);

// Cart routes
router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;