const express = require('express');
const router = express.Router();
const { 
  getTutorProfile,
  updateTutorProfile,
  updateTutorAvailability,
  approveTutorProfile
} = require('../controllers/tutorController');
const {
  createCourse,
  getTutorCourses,
  getCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');
const {
  createBatch,
  getCourseBatches,
  getBatch,
  updateBatch,
  deleteBatch
} = require('../controllers/batchController');
const { protectUser, requireRole } = require('../middleware/userAuth');
const { uploadImage } = require('../../config/cloudinary');

// Configure upload middleware for course files
const uploadCourseFiles = uploadImage.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'brochureFile', maxCount: 1 }
]);

// Tutor profile routes
router.get('/profile', protectUser, getTutorProfile);
router.put('/profile', protectUser, updateTutorProfile);
router.put('/availability', protectUser, requireRole('Tutor'), updateTutorAvailability);
router.put('/approve/:userId', protectUser, requireRole('Admin', 'SuperAdmin'), approveTutorProfile);

// Course routes
router.post('/courses', protectUser, requireRole('Tutor'), uploadCourseFiles, createCourse);
router.get('/courses', protectUser, requireRole('Tutor'), getTutorCourses);
router.get('/courses/:id', protectUser, getCourse);
router.put('/courses/:id', protectUser, requireRole('Tutor'), uploadCourseFiles, updateCourse);
router.delete('/courses/:id', protectUser, requireRole('Tutor'), deleteCourse);

// Batch routes
router.post('/courses/:courseId/batches', protectUser, requireRole('Tutor'), createBatch);
router.get('/courses/:courseId/batches', getCourseBatches); // Public route with conditional logic inside
router.get('/batches/:id', getBatch); // Public route with conditional logic inside
router.put('/batches/:id', protectUser, requireRole('Tutor'), updateBatch);
router.delete('/batches/:id', protectUser, requireRole('Tutor'), deleteBatch);

module.exports = router;