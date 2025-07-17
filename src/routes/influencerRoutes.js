const express = require('express');
const router = express.Router();
const { 
  getInfluencerProfile,
  updateInfluencerProfile,
  getInfluencerRateCards
} = require('../controllers/influencerController');
const { protectUser, requireRole } = require('../middleware/userAuth');

// Get influencer profile
router.get('/profile', protectUser, getInfluencerProfile);

// Update influencer profile
router.put('/profile', protectUser, updateInfluencerProfile);

// Get all rate cards for the influencer
router.get('/rate-cards', protectUser, getInfluencerRateCards);

module.exports = router;