const Cart = require('../models/Cart');
const CheckoutSession = require('../models/CheckoutSession');
const ProductOrder = require('../models/ProductOrder');
const ServiceBooking = require('../models/ServiceBooking');
const TutorBooking = require('../models/TutorBooking');
const InfluencerBooking = require('../models/InfluencerBooking');
const Product = require('../models/Product');
const Service = require('../models/Service');
const User = require('../models/User');
const RateCard = require('../models/RateCard');
const WalletTransaction = require('../models/WalletTransaction');
const { createConversationForBooking } = require('./conversationController');

// @desc    Create checkout session
// @route   POST /api/checkout
// @access  Private
exports.createCheckoutSession = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }
    
    // Get user's cart
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }
    
    // Calculate total amount and validate items
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of cart.items) {
      let itemPrice = 0;
      let isValid = false;
      
      switch (item.type) {
        case 'product':
          const product = await Product.findById(item.itemId);
          if (product) {
            itemPrice = product.price * item.quantity;
            isValid = true;
            validatedItems.push({
              type: 'product',
              item: product,
              quantity: item.quantity,
              price: itemPrice
            });
          }
          break;
          
        case 'service':
          const service = await Service.findById(item.itemId);
          if (service) {
            itemPrice = service.price;
            isValid = true;
            validatedItems.push({
              type: 'service',
              item: service,
              quantity: 1, // Services are always quantity 1
              price: itemPrice
            });
          }
          break;
          
        case 'tutor':
          const tutor = await User.findOne({ _id: item.itemId, roles: 'Tutor' });
          if (tutor && tutor.tutorProfile && tutor.tutorProfile.hourlyRate) {
            itemPrice = tutor.tutorProfile.hourlyRate;
            isValid = true;
            validatedItems.push({
              type: 'tutor',
              item: tutor,
              quantity: 1, // Tutor bookings are always quantity 1
              price: itemPrice
            });
          }
          break;
          
        case 'influencer':
          const rateCard = await RateCard.findById(item.itemId);
          if (rateCard) {
            itemPrice = rateCard.price.amount;
            isValid = true;
            validatedItems.push({
              type: 'influencer',
              item: rateCard,
              quantity: 1, // Influencer bookings are always quantity 1
              price: itemPrice
            });
          }
          break;
      }
      
      if (isValid) {
        totalAmount += itemPrice;
      }
    }
    
    if (validatedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items in cart'
      });
    }
    
    // Create checkout session
    const checkoutSession = await CheckoutSession.create({
      userId: req.user._id,
      cartSnapshot: cart.toObject(),
      totalAmount,
      currency: 'INR', // Default currency
      paymentStatus: 'pending',
      paymentMethod,
      createdAt: new Date()
    });
    
    // In a real application, you would integrate with a payment gateway here
    // For this example, we'll simulate a successful payment
    
    // Process the payment (simulated)
    const paymentSuccessful = true; // In a real app, this would come from the payment gateway
    const transactionId = 'txn_' + Math.random().toString(36).substring(2, 15); // Simulated transaction ID
    
    if (paymentSuccessful) {
      // Update checkout session
      checkoutSession.paymentStatus = 'paid';
      checkoutSession.transactionId = transactionId;
      checkoutSession.completedAt = new Date();
      
      // Process orders based on item types
      const orderRefs = [];
      
      // Group products for a single product order
      const productItems = validatedItems.filter(item => item.type === 'product');
      if (productItems.length > 0) {
        const productOrder = await ProductOrder.create({
          userId: req.user._id,
          products: productItems.map(item => ({
            productId: item.item._id,
            quantity: item.quantity,
            priceAtPurchase: item.item.price
          })),
          status: 'pending',
          createdAt: new Date()
        });
        
        orderRefs.push(productOrder._id);
      }
      
      // Create service bookings
      for (const item of validatedItems.filter(item => item.type === 'service')) {
        const serviceBooking = await ServiceBooking.create({
          userId: req.user._id,
          serviceId: item.item._id,
          amount: item.price,
          status: 'pending',
          createdAt: new Date()
        });
        
        orderRefs.push(serviceBooking._id);
      }
      
      // Create tutor bookings
      for (const item of validatedItems.filter(item => item.type === 'tutor')) {
        const tutorBooking = await TutorBooking.create({
          tutorId: item.item._id,
          studentId: req.user._id,
          amount: item.price,
          status: 'booked',
          createdAt: new Date()
        });
        
        orderRefs.push(tutorBooking._id);
      }
      
      // Create influencer bookings
      for (const item of validatedItems.filter(item => item.type === 'influencer')) {
        const rateCard = item.item;
        const influencer = await User.findById(rateCard.userId);
        
        if (influencer) {
          const booking = await InfluencerBooking.create({
            clientId: req.user._id,
            influencerId: influencer._id,
            rateCardId: rateCard._id,
            platform: rateCard.platform,
            contentType: rateCard.contentType,
            amountPaid: rateCard.price.amount,
            currency: rateCard.price.currency || 'INR',
            status: 'booked',
            createdAt: new Date()
          });
          
          // Add amount to influencer's wallet as pending payout
          await User.findByIdAndUpdate(influencer._id, {
            $inc: {
              'wallet.pendingPayouts': rateCard.price.amount,
              'wallet.totalEarned': rateCard.price.amount
            },
            $set: { 'wallet.lastUpdated': new Date() }
          });
          
          // Create wallet transaction record
          await WalletTransaction.create({
            userId: influencer._id,
            amount: rateCard.price.amount,
            type: 'credit',
            source: 'influencer_post',
            linkedBooking: booking._id,
            timestamp: new Date()
          });
          
          // Create a conversation between client and influencer
          await createConversationForBooking(booking);
          
          orderRefs.push(booking._id);
        }
      }
      
      // Update checkout session with order references
      checkoutSession.orderRefs = orderRefs;
      await checkoutSession.save();
      
      // Clear the cart after successful checkout
      cart.items = [];
      cart.updatedAt = new Date();
      await cart.save();
      
      res.status(200).json({
        success: true,
        message: 'Checkout successful',
        checkoutSession
      });
    } else {
      // Handle payment failure
      checkoutSession.paymentStatus = 'failed';
      await checkoutSession.save();
      
      res.status(400).json({
        success: false,
        message: 'Payment failed',
        checkoutSession
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get checkout session by ID
// @route   GET /api/checkout/:id
// @access  Private
exports.getCheckoutSession = async (req, res) => {
  try {
    const checkoutSession = await CheckoutSession.findById(req.params.id);
    
    if (!checkoutSession) {
      return res.status(404).json({
        success: false,
        message: 'Checkout session not found'
      });
    }
    
    // Check if user owns this checkout session
    if (checkoutSession.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this checkout session'
      });
    }
    
    res.status(200).json({
      success: true,
      checkoutSession
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's checkout history
// @route   GET /api/checkout/history
// @access  Private
exports.getCheckoutHistory = async (req, res) => {
  try {
    const checkoutSessions = await CheckoutSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: checkoutSessions.length,
      checkoutSessions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};