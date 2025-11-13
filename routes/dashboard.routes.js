import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { protect } from "../middleware/authMiddleware.js"; // protect middleware zaroori hai

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics for the logged-in user based on their role
// @access  Private
router.get("/stats", protect, getDashboardStats);

export default router;