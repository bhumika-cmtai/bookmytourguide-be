import express from "express";
import {
  getAllTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/testimonials.controller.js";

import { upload } from "../middleware/s3.uploads.js"; 
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/testimonials
 * @desc    Get all testimonials (supports pagination & search)
 * @access  Public
 */
router.get("/", getAllTestimonials);

/**
 * @route   GET /api/testimonials/:id
 * @desc    Get testimonial by ID
 * @access  Public
 */
router.get("/:id", getTestimonialById);

router.post(
  "/",
  protect,
  authorize("admin"),
  upload.single("video"),
  createTestimonial
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  upload.single("video"),
  updateTestimonial
);

router.delete("/:id", protect, authorize("admin"), deleteTestimonial);

export default router;
