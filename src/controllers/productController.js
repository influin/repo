const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Seller role)
exports.createProduct = async (req, res) => {
  try {
    // Add the user ID to the product
    req.body.userId = req.user._id;
    
    // Validate category exists
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: 'Category not found' });
    }
    
    // Validate subcategory if provided
    if (req.body.subCategory) {
      const subCategoryExists = await Category.findById(req.body.subCategory);
      if (!subCategoryExists) {
        return res.status(400).json({ success: false, message: 'SubCategory not found' });
      }
    }
    
    // Create product
    const product = await Product.create(req.body);
    
    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    // Build query
    let query = {};
    
    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Filter by subcategory
    if (req.query.subCategory) {
      query.subCategory = req.query.subCategory;
    }
    
    // Filter by active status
    query.isActive = true;
    
    // Filter by featured
    if (req.query.featured === 'true') {
      query.isFeatured = true;
    }
    
    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Execute query
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('userId', 'name')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Get total count
    const total = await Product.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('userId', 'name');
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Seller role, owner only)
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // Check if user is the owner of the product
    if (product.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }
    
    // Validate category if provided
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({ success: false, message: 'Category not found' });
      }
    }
    
    // Validate subcategory if provided
    if (req.body.subCategory) {
      const subCategoryExists = await Category.findById(req.body.subCategory);
      if (!subCategoryExists) {
        return res.status(400).json({ success: false, message: 'SubCategory not found' });
      }
    }
    
    // Update updatedAt field
    req.body.updatedAt = Date.now();
    
    // Update product
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Seller role, owner only)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // Check if user is the owner of the product
    if (product.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }
    
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's products
// @route   GET /api/products/user
// @access  Private
exports.getUserProducts = async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user._id })
      .populate('category', 'name')
      .populate('subCategory', 'name');
    
    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};