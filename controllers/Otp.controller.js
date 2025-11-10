import Otp from "../models/Otp.Model.js";
import User from "../models/Users.Model.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";

// @desc    Send OTP to user's email
// @route   POST /api/auth/send-otp
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }

    // Check if user is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "This email is already registered." });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    // Save OTP to the database
    await Otp.findOneAndUpdate({ email }, { email, otp, expiresAt }, { upsert: true, new: true });

    // Prepare email content
    const subject = "Your Verification Code for BookMyTourGuide";
    const htmlContent = `
      <h2 style="color: #333; font-size: 20px;">Email Verification</h2>
      <p style="font-size: 16px; color: #555;">
        Thank you for registering with BookMyTourGuide. Please use the following One-Time Password (OTP) to complete your registration:
      </p>
      <div style="text-align: center; margin: 25px 0;">
        <p style="font-size: 36px; font-weight: bold; color: #004aad; letter-spacing: 4px; border: 2px dashed #004aad; padding: 15px 20px; display: inline-block; border-radius: 8px;">
          ${otp}
        </p>
      </div>
      <p style="font-size: 14px; color: #777;">
        This code is valid for 10 minutes. If you did not request this, please ignore this email.
      </p>
    `;

    // Send the email
    const emailSent = await sendEmail(email, subject, htmlContent);

    if (emailSent) {
      res
        .status(200)
        .json({ success: true, message: "OTP sent successfully to your email." });
    } else {
      // This else block might not be reached if sendEmail throws an error,
      // but it's good for robustness.
      throw new Error("Failed to send OTP email.");
    }

  } catch (error) {
    console.error("Error in sendOtp controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An internal server error occurred while sending the OTP.",
    });
  }
};