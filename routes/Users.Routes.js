import express from "express";
import UsersModel from "../models/Users.Model.js";
import {
  getAllUsers,
  getUserById,
  getUsersByRole,
  createUser,
  updateUser,
  updateOwnProfile,
  deleteUser,
  adminApproveGuide,
  listGuides,
  search,
} from "../controllers/user.controller.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/s3.uploads.js";

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (supports pagination & search)
 * @access  Protected (admin only)
 */
router.get("/", protect, authorize("admin"), getAllUsers);
/**
 * @route   GET /api/users/search
 * @desc    Search packages and locations
 * @access  Public
 */
router.get("/search", search);

/**
 * @route   GET /api/users/me
 * @desc    Get own profile (current logged-in user)
 * @access  Protected (all authenticated users)
 */

router.get("/me", protect, async (req, res) => {
  try {
    const user = await UsersModel.findById(req.user._id)
      .select("-password")
      .populate("guideProfile");

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/users/me
 * @desc    Update own profile (user/guide can update their own data)
 * @access  Protected (all authenticated users)
 */
router.put(
  "/me",
  protect,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "license", maxCount: 1 },
  ]),
  updateOwnProfile
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Protected (admin, or own profile)
 */
router.get("/:id", protect, getUserById);

/**
 * @route   GET /api/users/role/:role
 * @desc    Get users by role
 * @access  Protected (admin only)
 */
router.get("/role/:role", protect, authorize("admin"), getUsersByRole);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (admin can update anyone)
 * @access  Protected (admin only)
 */
router.put("/:id", protect, authorize("admin"), updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Protected (admin only)
 */
router.delete("/:id", protect, authorize("admin"), deleteUser);

// ===== Guide Management Routes =====

/**
 * @route   GET /api/users/guides
 * @desc    List all guides with optional filtering
 * @access  Protected (admin only)
 */
router.get("/guides/all", protect, listGuides);

/**
 * @route   PATCH /api/users/guides/:id/approve
 * @desc    Approve/reject guide
 * @access  Protected (admin only)
 */
router.patch(
  "/guides/:id/approve",
  protect,
  authorize("admin"),
  adminApproveGuide
);

export default router;
