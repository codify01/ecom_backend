const express = require('express')
const { registerUser, loginUser, loginWithFace } = require('../controllers/user.controller')
const router = express.Router()
const multer = require('multer')

const upload = multer({ dest: 'uploads/' });

router.post('/register', upload.single('image'), (req, res, next) => {
    console.log("Image upload:", req.file)
    next()
}, registerUser);


router.post('/login', loginUser);

router.post('/login-with-face', upload.single('image'), loginWithFace);

module.exports = router;
