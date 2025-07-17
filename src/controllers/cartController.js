const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Service = require('../models/Service');
const User = require('../models/User');
const RateCard = require('../models/RateCard');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      // Create a new cart if one doesn't exist
      cart = await Cart.create({
        userId: req.user._id,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Populate item details based on type
    const populatedItems = [];
    
    for (const item of cart.items) {
      let itemDetails = null;
      
      switch (item.type) {
        case 'product':
          itemDetails = await Product.findById(item.itemId).select('title price images');
          break;
        case 'service':
          itemDetails = await Service.findById(item.itemId).select('title price images');
          break;
        case 'tutor':
          // For tutor bookings, we need to get the tutor's details
          const tutor = await User.findById(item.itemId).select('name profileURL tutorProfile');
          itemDetails = tutor ? {
            name: tutor.name,
            profileURL: tutor.profileURL,
            hourlyRate: tutor.tutorProfile?.hourlyRate || 0
          } : null;
          break;
        case 'influencer':
          // For influencer bookings, we need to get the rate card
          itemDetails = await RateCard.findById(item.itemId)
            .populate('userId', 'name profileURL');
          break;
      }
      
      if (itemDetails) {
        populatedItems.push({
          ...item.toObject(),
          details: itemDetails
        });
      }
    }
    
    res.status(200).json({
      success: true,
      cart: {
        ...cart.toObject(),
        items: populatedItems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const { type, itemId, quantity = 1, customNote } = req.body;
    
    if (!type || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item type and ID are required'
      });
    }
    
    // Validate item exists based on type
    let itemExists = false;
    
    switch (type) {
      case 'product':
        itemExists = await Product.exists({ _id: itemId });
        break;
      case 'service':
        itemExists = await Service.exists({ _id: itemId });
        break;
      case 'tutor':
        itemExists = await User.exists({ _id: itemId, roles: 'Tutor' });
        break;
      case 'influencer':
        itemExists = await RateCard.exists({ _id: itemId });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid item type'
        });
    }
    
    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Find or create cart
    let cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      cart = await Cart.create({
        userId: req.user._id,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.type === type && item.itemId.toString() === itemId
    );
    
    if (existingItemIndex > -1) {
      // Update quantity if item exists
      cart.items[existingItemIndex].quantity += quantity;
      if (customNote) {
        cart.items[existingItemIndex].customNote = customNote;
      }
    } else {
      // Add new item
      cart.items.push({
        type,
        itemId,
        quantity,
        customNote
      });
    }
    
    cart.updatedAt = new Date();
    await cart.save();
    
    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      cart
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update cart item
// @route   PUT /api/cart/items/:itemId
// @access  Private
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity, customNote } = req.body;
    const { itemId } = req.params;
    
    if (!quantity && !customNote) {
      return res.status(400).json({
        success: false,
        message: 'Please provide quantity or custom note to update'
      });
    }
    
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Find the item in the cart
    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Update item
    if (quantity !== undefined) {
      cart.items[itemIndex].quantity = quantity;
    }
    
    if (customNote !== undefined) {
      cart.items[itemIndex].customNote = customNote;
    }
    
    cart.updatedAt = new Date();
    await cart.save();
    
    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      cart
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Find the item in the cart
    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Remove item
    cart.items.splice(itemIndex, 1);
    cart.updatedAt = new Date();
    await cart.save();
    
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    cart.items = [];
    cart.updatedAt = new Date();
    await cart.save();
    
    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      cart
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};