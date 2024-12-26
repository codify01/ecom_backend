const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs"); // Import bcrypt
const User = require("../models/user.model"); // Replace with your User model

// Forgot Password Controller
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User  with this email does not exist." });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Encrypt the token for storage in the database
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Set the token and expiration in the user document
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // Token valid for 10 minutes
    await user.save();

    // Construct reset link (frontend route for resetting the password)
    const resetURL = `https://ecom-iota-opal.vercel.app/#/reset-password/${resetToken}`;

    // Send email
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "Gmail", // Use environment variable
      auth: {
        user: process.env.EMAIL, // Your email
        pass: process.env.EMAIL_PASSWORD, // Your email password
      },
    });

    const mailOptions = {
      from: `"YourApp Support" <${process.env.EMAIL}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested to reset your password. Click the link below to reset it:</p>
             <p><a href="${resetURL}" target="_blank">Reset Password</a></p>
             <p>If you didn't request this, please ignore this email.</p>`,
    };

    // Send the email and handle potential errors
    try {
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.error("Error sending email:", mailError);
      return res.status(500).json({ success: false, message: "Failed to send email.", error: mailError });
    }

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
  }
};

// Reset Password Controller
const resetPassword = async (req, res) => {
  const { token } = req.params; // From URL
  const { newPassword } = req.body;

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }, // Ensure token hasn't expired
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token." });
    }

    // Update the password and clear the reset token fields
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
  }
};

// Exporting functions using module.exports
module.exports = {
  forgotPassword,
  resetPassword,
};