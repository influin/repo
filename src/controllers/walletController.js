const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

// @desc    Get user wallet information
// @route   GET /api/wallet
// @access  Private
exports.getWalletInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wallet');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      wallet: user.wallet || { balance: 0, pendingPayouts: 0, totalEarned: 0, totalPaidOut: 0 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user wallet transactions
// @route   GET /api/wallet/transactions
// @access  Private
exports.getWalletTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.user._id })
      .populate('linkedBooking', 'platform contentType status')
      .sort({ timestamp: -1 });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};