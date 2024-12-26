const express = require('express');
const { registerUser , loginUser , loginWithFace } = require('../controllers/user.controller');
const { forgotPassword, resetPassword } = require('../controllers/authController'); // Import authController functions
const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// User registration route
router.post('/register', upload.single('image'), (req, res, next) => {
    console.log("Image upload:", req.file);
    next();
}, registerUser );

// User login route
router.post('/login', loginUser );

// Login with face recognition route
router.post('/login-with-face', upload.single('image'), loginWithFace);

// Forgot password route
router.post('/forget-password', forgotPassword); // Use forgotPassword from authController

// Reset password route
router.post('/reset-password/:token', resetPassword); // Use resetPassword from authController

module.exports = router;