const express = require('express')
const { registerUser, loginUser, loginWithFace } = require('../controllers/user.controller')
const router = express.Router()
const multer = require('multer')

// Configure multer for image uploads
const upload = multer({ dest: 'uploads/' });

// Route for user registration (image is optional for face recognition)
router.post('/register', upload.single('image'), (req, res, next) => {
    console.log("Image upload:", req.file); // Log the uploaded image details
    next(); // Proceed to controller
}, registerUser);


// Route for login with email and password
router.post('/login', loginUser);

// Route for login with face recognition
router.post('/login-with-face', upload.single('image'), loginWithFace);

module.exports = router;
