const Batch = require('../models/Batch');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Create a new batch for a course
// @route   POST /api/tutor/courses/:courseId/batches
// @access  Private (Tutor role)
exports.createBatch = async (req, res) => {
  try {
    // Check if course exists and belongs to the tutor
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check if user is the course owner
    if (course.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to create batches for this course' 
      });
    }
    
    // Add course ID and tutor ID to the batch
    req.body.courseId = req.params.courseId;
    req.body.tutorId = req.user._id;
    
    // If price is not provided, use the course base price
    if (!req.body.price) {
      req.body.price = course.basePrice;
    }
    
    // Create batch
    const batch = await Batch.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      batch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all batches for a course
// @route   GET /api/tutor/courses/:courseId/batches
// @access  Private (Tutor role for all batches, Public for active batches)
exports.getCourseBatches = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Build query
    const queryObj = { courseId: req.params.courseId };
    
    // If not the course owner, only show active batches
    if (!req.user || course.tutorId.toString() !== req.user._id.toString()) {
      queryObj.isActive = true;
      // Only show batches where enrollment is still open
      queryObj.enrollmentEndDate = { $gte: new Date() };
    }
    
    const batches = await Batch.find(queryObj);
    
    res.status(200).json({
      success: true,
      count: batches.length,
      batches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single batch
// @route   GET /api/tutor/batches/:id
// @access  Private (Tutor role for owner, Public for active batches)
exports.getBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('courseId', 'title description thumbnail');
    
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    
    // If not the batch owner, only show active batches
    if (!req.user || batch.tutorId.toString() !== req.user._id.toString()) {
      if (!batch.isActive) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }
    }
    
    res.status(200).json({
      success: true,
      batch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a batch
// @route   PUT /api/tutor/batches/:id
// @access  Private (Tutor role - owner only)
exports.updateBatch = async (req, res) => {
  try {
    let batch = await Batch.findById(req.params.id);
    
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    
    // Check if user is the batch owner
    if (batch.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to update this batch' 
      });
    }
    
    // Update batch
    batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      batch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a batch
// @route   DELETE /api/tutor/batches/:id
// @access  Private (Tutor role - owner only)
exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    
    // Check if user is the batch owner
    if (batch.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to delete this batch' 
      });
    }
    
    // Check if batch has enrolled students
    if (batch.currentEnrollments > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete batch with enrolled students' 
      });
    }
    
    // Delete batch
    await Batch.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Enroll in a batch
// @route   POST /api/tutor/batches/:id/enroll
// @access  Private
exports.enrollInBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    
    // Check if batch is active
    if (!batch.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'This batch is not active for enrollment' 
      });
    }
    
    // Check if enrollment end date has passed
    if (new Date() > new Date(batch.enrollmentEndDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Enrollment period for this batch has ended' 
      });
    }
    
    // Check if batch is full
    if (batch.currentEnrollments >= batch.maxStudents) {
      return res.status(400).json({ 
        success: false, 
        message: 'This batch is full' 
      });
    }
    
    // Check if user is already enrolled
    const alreadyEnrolled = batch.enrolledStudents.some(
      student => student.studentId.toString() === req.user._id.toString()
    );
    
    if (alreadyEnrolled) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already enrolled in this batch' 
      });
    }
    
    // Calculate effective price (after discount)
    const effectivePrice = batch.price - (batch.price * (batch.discountPercentage / 100));
    
    // Add student to enrolled students
    batch.enrolledStudents.push({
      studentId: req.user._id,
      paymentStatus: 'Completed', // This would normally be handled by a payment gateway
      amountPaid: effectivePrice
    });
    
    // Increment current enrollments
    batch.currentEnrollments += 1;
    
    await batch.save();
    
    // Update course total enrollments
    await Course.findByIdAndUpdate(
      batch.courseId,
      { $inc: { totalEnrollments: 1 } }
    );
    
    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in the batch',
      enrollmentDetails: {
        batchId: batch._id,
        courseId: batch.courseId,
        enrollmentDate: new Date(),
        amountPaid: effectivePrice,
        paymentStatus: 'Completed'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};