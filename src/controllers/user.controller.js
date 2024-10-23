const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const multer = require('multer');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const secret = process.env.SECRET; // Fixed typo here
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Multer configuration for image uploads
const upload = multer({ dest: 'uploads/' });

// Load models for face recognition (place models in /models directory)
async function loadModels() {
    const MODEL_URL = path.join(__dirname, '../models');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
}
loadModels(); // Call to load the models

// User registration controller with face descriptor
const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNumber, role } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists', status: false });
        }

        // Create a new user without saving to database yet
        const newUser = new User({
            firstName,
            lastName,
            email,
            password,  // Password hashing will be handled in User model
            phoneNumber,
            role
        });

        // If an image is uploaded, process it to extract the face descriptor
        if (req.file) {
            const imgPath = path.join(__dirname, '../', req.file.path);
            const img = await canvas.loadImage(imgPath);
            const result = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

            if (result) {
                // Store the face descriptor
                newUser.faceDescriptor = result.descriptor;
            } else {
                return res.status(400).json({ message: 'No face detected in the uploaded image', status: false });
            }
        }

        // Save the new user to the database
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully', user: newUser, status: true });
    } catch (err) {
        res.status(500).json({ message: 'Error occurred during registration', error: err.message, status: false });
    }
};

// User login controller
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found', status: false });
        }

        // Compare passwords
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Incorrect password', status: false });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: '7h' });

        res.status(200).json({ message: 'User logged in successfully', user, status: true, token });
    } catch (err) {
        res.status(500).json({ message: 'Error logging in', error: err.message, status: false });
    }
};

// Face recognition login controller
const loginWithFace = async (req, res) => {
    try {
        const imgPath = path.join(__dirname, '../', req.file.path);
        const img = await canvas.loadImage(imgPath);

        // Detect the face and get the descriptor
        const result = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        if (!result) {
            return res.status(400).json({ message: 'No face detected', status: false });
        }

        const uploadedDescriptor = result.descriptor;

        // Fetch all users and compare the face descriptor with stored ones
        const users = await User.find({});
        let bestMatchUser = null;
        let bestMatchDistance = Number.MAX_VALUE;

        users.forEach(user => {
            if (user.faceDescriptor) {
                const distance = faceapi.euclideanDistance(uploadedDescriptor, user.faceDescriptor);
                if (distance < 0.6 && distance < bestMatchDistance) {
                    bestMatchUser = user;
                    bestMatchDistance = distance;
                }
            }
        });

        if (bestMatchUser) {
            // Generate JWT token if face match is found
            const token = jwt.sign({ id: bestMatchUser._id, role: bestMatchUser.role }, secret, { expiresIn: '7h' });
            return res.status(200).json({ message: 'Login successful', user: bestMatchUser, token, status: true });
        } else {
            return res.status(401).json({ message: 'Face not recognized', status: false });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error logging in with face', error: err.message, status: false });
    }
};

module.exports = { registerUser, loginUser, loginWithFace };
