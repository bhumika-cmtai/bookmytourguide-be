import jwt from "jsonwebtoken";
import User from "../models/Users.Model.js";

// Protect routes - check JWT from cookies
const protect = async (req, res, next) => {
  // console.log("protect here")
  try {
    const token = req.cookies?.token;
    // console.log("token ", token)

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request, excluding password
    req.user = await User.findById(decoded.id)
      .select("-password")
      .populate("guideProfile");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    next();
  } catch (error) {
  console.log("error in aut", error)

    console.error("Auth middleware error:", error.message);
    // Clear invalid token
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res.status(401).json({
      success: false,
      message: "Not authorized, token invalid",
    });
  }
};

// Optional role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' not authorized`,
      });
    }
    next();
  };
};

export { protect, authorize };
