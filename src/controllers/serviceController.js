const Service = require('../models/Service');
const Category = require('../models/Category');

// @desc    Create a new service
// @route   POST /api/services
// @access  Private (Service Provider role)
exports.createService = async (req, res) => {
  try {
    // Add the user ID to the service
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
    
    // Create service
    const service = await Service.create(req.body);
    
    res.status(201).json({
      success: true,
      service
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all services
// @route   GET /api/services
// @access  Public
exports.getServices = async (req, res) => {
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
      query.basePrice = {};
      if (req.query.minPrice) query.basePrice.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.basePrice.$lte = Number(req.query.maxPrice);
    }
    
    // Filter by location type
    if (req.query.locationType) {
      query.locationType = req.query.locationType;
    }
    
    // Filter by city
    if (req.query.city) {
      query['serviceArea.city'] = req.query.city;
    }
    
    // Filter by pincode
    if (req.query.pincode) {
      query['serviceArea.pincode'] = req.query.pincode;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Execute query
    const services = await Service.find(query)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('userId', 'name')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Get total count
    const total = await Service.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: services.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      services
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public
exports.getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('userId', 'name');
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Service Provider role, owner only)
exports.updateService = async (req, res) => {
  try {
    let service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    // Check if user is the owner of the service
    if (service.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this service' });
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
    
    // Update service
    service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private (Service Provider role, owner only)
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    // Check if user is the owner of the service
    if (service.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this service' });
    }
    
    await service.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's services
// @route   GET /api/services/user
// @access  Private
exports.getUserServices = async (req, res) => {
  try {
    const services = await Service.find({ userId: req.user._id })
      .populate('category', 'name')
      .populate('subCategory', 'name');
    
    res.status(200).json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};