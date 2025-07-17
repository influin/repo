const Course = require('../models/Course');
const User = require('../models/User');
const { cloudinary } = require('../../config/cloudinary');

// Helper function to get public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const splitUrl = url.split('/');
  const filename = splitUrl[splitUrl.length - 1];
  return `influencer-app/${filename.split('.')[0]}`;
};

// @desc    Create a new course
// @route   POST /api/tutor/courses
// @access  Private (Tutor role)
exports.createCourse = async (req, res) => {
  try {
    // Check if user is approved as a tutor
    const user = await User.findById(req.user._id);
    if (!user.tutorProfile || !user.tutorProfile.isApproved) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only approved tutors can create courses' 
      });
    }

    // Add tutor ID to the course
    req.body.tutorId = req.user._id;
    
    // Handle file uploads if present
    if (req.files) {
      // Process thumbnail
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        req.body.thumbnail = req.files.thumbnail[0].path;
      }
      
      // Process brochure file
      if (req.files.brochureFile && req.files.brochureFile[0]) {
        req.body.brochureFile = req.files.brochureFile[0].path;
      }
    }
    
    // Create course
    const course = await Course.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all courses by tutor
// @route   GET /api/tutor/courses
// @access  Private (Tutor role)
exports.getTutorCourses = async (req, res) => {
  try {
    const courses = await Course.find({ tutorId: req.user._id });
    
    res.status(200).json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single course
// @route   GET /api/tutor/courses/:id
// @access  Private
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    res.status(200).json({
      success: true,
      course
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a course
// @route   PUT /api/tutor/courses/:id
// @access  Private (Tutor role - owner only)
exports.updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check if user is the course owner
    if (course.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to update this course' 
      });
    }
    
    // Handle file uploads if present
    if (req.files) {
      // Process thumbnail
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        // Delete old thumbnail from Cloudinary if exists
        if (course.thumbnail) {
          const publicId = getPublicIdFromUrl(course.thumbnail);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
        req.body.thumbnail = req.files.thumbnail[0].path;
      }
      
      // Process brochure file
      if (req.files.brochureFile && req.files.brochureFile[0]) {
        // Delete old brochure from Cloudinary if exists
        if (course.brochureFile) {
          const publicId = getPublicIdFromUrl(course.brochureFile);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
        req.body.brochureFile = req.files.brochureFile[0].path;
      }
    }
    
    // Update course
    course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a course
// @route   DELETE /api/tutor/courses/:id
// @access  Private (Tutor role - owner only)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check if user is the course owner
    if (course.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to delete this course' 
      });
    }
    
    // Delete files from Cloudinary if they exist
    if (course.thumbnail) {
      const publicId = getPublicIdFromUrl(course.thumbnail);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }
    
    if (course.brochureFile) {
      const publicId = getPublicIdFromUrl(course.brochureFile);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }
    
    // Delete course
    await course.remove();
    
    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all public courses (for students/users)
// @route   GET /api/courses
// @access  Public
exports.getAllPublicCourses = async (req, res) => {
  try {
    // Build query
    const queryObj = { isActive: true };
    
    // Filter by subject if provided
    if (req.query.subject) {
      queryObj.subjects = { $in: [req.query.subject] };
    }
    
    // Filter by skill level if provided
    if (req.query.skillLevel) {
      queryObj.skillLevel = req.query.skillLevel;
    }
    
    // Filter by price range if provided
    if (req.query.minPrice && req.query.maxPrice) {
      queryObj.basePrice = { 
        $gte: Number(req.query.minPrice), 
        $lte: Number(req.query.maxPrice) 
      };
    } else if (req.query.minPrice) {
      queryObj.basePrice = { $gte: Number(req.query.minPrice) };
    } else if (req.query.maxPrice) {
      queryObj.basePrice = { $lte: Number(req.query.maxPrice) };
    }
    
    // Execute query with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const courses = await Course.find(queryObj)
      .populate('tutorId', 'name profileURL tutorProfile.rating')
      .skip(startIndex)
      .limit(limit);
    
    const total = await Course.countDocuments(queryObj);
    
    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      courses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};