// auth.controller.js
import User from "../models/Users.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Otp from "../models/Otp.Model.js";
import Guide from "../models/Guides.Model.js";

dotenv.config();

// Create a JWT token
const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", //token valid for 7 days
  });
};

const getCookieOption = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax", // Correction: Was 'lax' for production
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const verifyOtpAndRegister = async (req, res) => {
  try {
    const { name, email, password, role, otp, mobile } = req.body; // Added mobile

    // ✅ Check OTP validity
    const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 });
    if (!otpRecord)
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new one." });

    if (otpRecord.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    if (otpRecord.expiresAt < new Date())
      return res.status(400).json({ success: false, message: "OTP has expired" });

    // OTP is valid → continue registration
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
      mobile: mobile, // Save mobile number
    });

    // Handle file uploads (if any)
    const photoPath = req.files?.photo ? req.files.photo[0].path : null;
    const licensePath = req.files?.license ? req.files.license[0].path : null;

    // If guide → create profile
    if (role === "guide") {
      const guideProfile = await Guide.create({
        user: user._id,
        name,
        email,
        mobile, // Save mobile to guide profile as well
        photo: photoPath, // Save photo path
        license: licensePath, // Save license path
        isApproved: false,
        profileComplete: false, // Profile is not complete yet
      });

      user.guideProfile = guideProfile._id;
      await user.save();
    }

    // Delete OTP after success
    await Otp.deleteMany({ email });

    // Token
    const token = createToken(user._id);
    res.cookie("token", token, getCookieOption());

    res.status(201).json({
      success: true,
      message:
        role === "guide"
          ? "Guide registered successfully. Awaiting admin approval."
          : "User registered successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        guideProfile: role === "guide" ? user.guideProfile : null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Login user
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .select("+password")
      .populate("guideProfile");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = createToken(user._id);
    res.cookie("token", token, getCookieOption());

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        guideProfile: user.guideProfile || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
export const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
export const getCurrentUser = async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select("-password")
      .populate("guideProfile");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Get current user error:", error);

    // Clear invalid token
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

// @desc    Refresh token endpoint
// @route   POST /api/auth/refresh
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Create new token and set in cookie
    const newToken = createToken(user._id);
    res.cookie("token", newToken, getCookieOption()); // Corrected function call

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);

    // Clear invalid token
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};