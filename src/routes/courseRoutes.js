const express = require('express');
const router = express.Router();
const { getAllPublicCourses, getCourse } = require('../controllers/courseController');
const { enrollInBatch } = require('../controllers/batchController');
const { protectUser } = require('../middleware/userAuth');

// Public routes
router.get('/', getAllPublicCourses);
router.get('/:id', getCourse);

// Protected routes
router.post('/batches/:id/enroll', protectUser, enrollInBatch);

module.exports = router;