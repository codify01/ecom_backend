const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const faceapi = require("face-api.js");
const canvas = require("canvas");
const path = require("path");
const fs = require("fs");

const secret = process.env.SECRET; // Fixed typo
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Multer configuration for image uploads
const upload = multer({ dest: "uploads/" });

// Load models for face recognition (ensure models are in the /models directory)
async function loadModels() {
    const MODEL_URL = path.join(__dirname, "../models");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
}
loadModels(); // Call to load the models

// User registration controller with face descriptor
const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNumber, role } = req.body;

        console.log("Incoming registration data:", req.body); // Debug incoming data

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists", status: false });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber,
            role,
        });

        // Process face image if uploaded
        if (req.file) {
            const imgPath = path.join(__dirname, "../", req.file.path);
            const img = await canvas.loadImage(imgPath);
            console.log("Image loaded successfully"); // Debug

            const result = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            if (result) {
                newUser.faceDescriptor = Array.from(result.descriptor); // Convert to array for JSON compatibility
                console.log("Face descriptor extracted successfully"); // Debug
            } else {
                console.error("No face detected in the image");
                return res.status(400).json({ message: "No face detected in the uploaded image", status: false });
            }

            // Delete uploaded image after processing
            fs.unlink(req.file.path, (err) => {
                if (err) console.error(`Failed to delete image: ${err.message}`);
            });
        }

        await newUser.save();
        console.log("User registered successfully"); // Debug
        res.status(201).json({ message: "User registered successfully", user: newUser, status: true });
    } catch (err) {
        console.error("Error during registration:", err); // Debug error
        res.status(500).json({ message: "Error occurred during registration", error: err.message, status: false });
    }
};

// User login controller
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found", status: false });
        }

        // Compare passwords
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Incorrect password", status: false });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: "7h" });

        res.status(200).json({ message: "User logged in successfully", user, status: true, token });
    } catch (err) {
        console.error("Error logging in:", err); // Debug
        res.status(500).json({ message: "Error logging in", error: err.message, status: false });
    }
};

// Face recognition login controller
const loginWithFace = async (req, res) => {
    try {
        if (!req.file || !req.file.path) {
            return res.status(400).json({ message: "Image file is required", status: false });
        }

        const imgPath = path.join(__dirname, "../", req.file.path);
        const img = await canvas.loadImage(imgPath);

        // Detect the face and get the descriptor
        const result = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        if (!result) {
            return res.status(400).json({ message: "No face detected", status: false });
        }

        const uploadedDescriptor = result.descriptor;

        // Fetch all users and compare the face descriptor with stored ones
        const users = await User.find({});
        let bestMatchUser = null;
        let bestMatchDistance = Number.MAX_VALUE;

        users.forEach((user) => {
            if (user.faceDescriptor) {
                const storedDescriptor = new Float32Array(user.faceDescriptor);
                const distance = faceapi.euclideanDistance(uploadedDescriptor, storedDescriptor);
                console.log(`Distance for user ${user.email}: ${distance}`); // Debug distances

                if (distance < 0.6 && distance < bestMatchDistance) {
                    bestMatchUser = user;
                    bestMatchDistance = distance;
                }
            }
        });

        // Delete uploaded image after processing
        fs.unlink(req.file.path, (err) => {
            if (err) console.error(`Failed to delete image: ${err.message}`);
        });

        if (bestMatchUser) {
            // Generate JWT token if face match is found
            const token = jwt.sign({ id: bestMatchUser._id, role: bestMatchUser.role }, secret, { expiresIn: "7h" });
            return res.status(200).json({ message: "Login successful", user: bestMatchUser, token, status: true });
        } else {
            return res.status(401).json({ message: "Face not recognized", status: false });
        }
    } catch (err) {
        console.error("Error logging in with face:", err); // Debug
        res.status(500).json({ message: "Error logging in with face", error: err.message, status: false });
    }
};

module.exports = { registerUser, loginUser, loginWithFace, upload };
