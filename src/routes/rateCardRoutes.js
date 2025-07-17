const express = require('express');
const router = express.Router();
const { 
  createRateCard, 
  getUserRateCards, 
  getRateCard, 
  updateRateCard, 
  deleteRateCard 
} = require('../controllers/rateCardController');
const { protectUser, requireRole } = require('../middleware/userAuth');

// Protected routes - Influencer role required for creation
router.post('/', protectUser, requireRole('Influencer'), createRateCard);

// Protected routes - Any authenticated user
router.get('/', protectUser, getUserRateCards);
router.get('/:id', protectUser, getRateCard);
router.put('/:id', protectUser, updateRateCard);
router.delete('/:id', protectUser, deleteRateCard);

module.exports = router;