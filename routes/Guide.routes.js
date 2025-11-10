import express from "express";
import {
  getGuideProfile,
  updateGuideProfile,
  approveGuideProfile,
  updateGuideAvailability
} from "../controllers/guide.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js"; // Assuming you have these
import { upload } from "../middleware/s3.uploads.js"; // Correct path to your s3 uploader

const router = express.Router();

// Get current guide's profile
// Middleware 'protect' verifies JWT, 'isGuide' checks the user role.
router.get("/profile", protect,getGuideProfile);

// Update current guide's profile
// The 'upload.fields' middleware will handle 'photo' and 'license' file uploads
router.put(
  "/profile/update",
  protect,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "license", maxCount: 1 },
  ]),
  updateGuideProfile
);

router.put(
  "/availability",
  protect, // Only the logged-in guide can access
  updateGuideAvailability
);

router.patch(
  "/:id/approve",       // Matches the URL from the frontend
  protect,              // Ensures the user is logged in
  authorize("admin"),   // Ensures the user is an admin
  approveGuideProfile   // Executes our new controller function
);

export default router;