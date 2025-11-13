import express from "express";
import {
  createPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  getRecommendedPackages 
} from "../controllers/package.controller.js";
import { upload } from "../middleware/s3.uploads.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get("/", getAllPackages);
router.get("/recommended", getRecommendedPackages);

router.get("/:id", getPackageById);

// --- ADMIN ONLY ROUTES ---
// 'images' field se max 5 files upload karein
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.array("images", 5), // .array() for multiple files
  createPackage
);

// @route   GET /api/packages/recommended
// @desc    Get a list of recommended packages
// @access  Public

router.put(
  "/:id",
  protect,
  authorize("admin"),
  upload.array("images", 5), // .array() for multiple files
  updatePackage
);


router.delete("/:id", protect, authorize("admin"), deletePackage);

export default router;