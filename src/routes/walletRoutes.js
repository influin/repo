const express = require('express');
const router = express.Router();
const { 
  getWalletInfo,
  getWalletTransactions
} = require('../controllers/walletController');
const { protectUser } = require('../middleware/userAuth');

// All wallet routes are protected
router.use(protectUser);

// Get wallet info
router.get('/', getWalletInfo);

// Get wallet transactions
router.get('/transactions', getWalletTransactions);

module.exports = router;