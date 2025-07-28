const express = require('express');
const router = express.Router();
const { 
  getInfluencerProfile,
  updateInfluencerProfile,
  getInfluencerRateCards,
  getAllInfluencers,
  getInfluencerById,
  getInfluencersByCategory
} = require('../controllers/influencerController');
const { protectUser, requireRole } = require('../middleware/userAuth');

// Get influencer profile
router.get('/profile', protectUser, getInfluencerProfile);

// Update influencer profile
router.put('/profile', protectUser, updateInfluencerProfile);

// Get all rate cards for the influencer
router.get('/rate-cards', protectUser, getInfluencerRateCards);

// Get all influencers except current user
router.get('/all', protectUser, getAllInfluencers);

// Get influencers by category
router.get('/category/:categoryName', protectUser, getInfluencersByCategory);

// Get single influencer by ID
router.get('/:id', protectUser, getInfluencerById);

module.exports = router;