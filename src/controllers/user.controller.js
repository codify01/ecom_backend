const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const faceapi = require("face-api.js");
const canvas = require("canvas");
const path = require("path");
const fs = require("fs");

const secret = process.env.SECRET; // JWT Secret
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Multer configuration for image uploads
const uploadDir = path.join(__dirname, "../uploads"); // Ensure this directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
    dest: uploadDir,
});

// Load models for face recognition
async function loadModels() {
    const MODEL_URL = path.join(__dirname, "../models");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
}
loadModels(); // Load models at server start

// Helper to delete files safely
const deleteFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete file at ${filePath}: ${err.message}`);
    });
};

// User registration with optional face descriptor
const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNumber, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists", status: false });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber,
            role,
        });

        if (req.file) {
            const imgPath = path.resolve(req.file.path); // Use absolute path
            const img = await canvas.loadImage(imgPath);

            const result = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            if (result) {
                newUser.faceDescriptor = Array.from(result.descriptor);
                console.log("Face descriptor successfully extracted.");
            } else {
                deleteFile(imgPath); // Clean up the uploaded file
                return res.status(400).json({ message: "No face detected in the uploaded image", status: false });
            }
            deleteFile(imgPath); // Clean up the uploaded file after processing
        }

        await newUser.save();
        console.log("User registered successfully.");
        res.status(201).json({ message: "User registered successfully", user: newUser, status: true });
    } catch (err) {
        console.error("Error during registration:", err);
        res.status(500).json({ message: "Error occurred during registration", error: err.message, status: false });
    }
};

// User login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found", status: false });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Incorrect password", status: false });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: "7h" });

        res.status(200).json({ message: "User logged in successfully", user, status: true, token });
    } catch (err) {
        console.error("Error logging in:", err);
        res.status(500).json({ message: "Error logging in", error: err.message, status: false });
    }
};

// Login with face recognition
const loginWithFace = async (req, res) => {
    try {
        if (!req.file || !req.file.path) {
            return res.status(400).json({ message: "Image file is required", status: false });
        }

        const imgPath = path.resolve(req.file.path);
        const img = await canvas.loadImage(imgPath);

        const result = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        if (!result) {
            deleteFile(imgPath);
            return res.status(400).json({ message: "No face detected in the uploaded image", status: false });
        }

        const uploadedDescriptor = result.descriptor;

        const users = await User.find({});
        let bestMatchUser = null;
        let bestMatchDistance = Number.MAX_VALUE;

        users.forEach((user) => {
            if (user.faceDescriptor) {
                const storedDescriptor = new Float32Array(user.faceDescriptor);
                const distance = faceapi.euclideanDistance(uploadedDescriptor, storedDescriptor);
                console.log(`Distance for user ${user.email}: ${distance}`);

                if (distance < 0.6 && distance < bestMatchDistance) {
                    bestMatchUser = user;
                    bestMatchDistance = distance;
                }
            }
        });

        deleteFile(imgPath); // Clean up the uploaded file

        if (bestMatchUser) {
            const token = jwt.sign({ id: bestMatchUser._id, role: bestMatchUser.role }, secret, { expiresIn: "7h" });
            return res.status(200).json({ message: "Login successful", user: bestMatchUser, token, status: true });
        } else {
            return res.status(401).json({ message: "Face not recognized", status: false });
        }
    } catch (err) {
        console.error("Error logging in with face:", err);
        res.status(500).json({ message: "Error logging in with face", error: err.message, status: false });
    }
};

module.exports = { registerUser, loginUser, loginWithFace, upload };
