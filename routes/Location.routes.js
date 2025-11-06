// routes/location.routes.js
import express from "express";
import {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
} from "../controllers/location.controller.js";
import { upload } from "../middleware/s3.uploads.js"; 
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- PUBLIC ROUTES (No Auth Needed) ---
router.get("/", getAllLocations);
router.get("/:id", getLocationById);

// --- ADMIN ONLY ROUTES (Protected) ---
// 'image' field se ek file upload handle karein
router.post(
  "/",
  protect,
  authorize("admin"),
  upload.single("image"),
  createLocation
);

router
  .route("/:id")
  .put(
    protect,
    authorize("admin"),
    upload.single("image"),
    updateLocation
  )
  .delete(
    protect,
    authorize("admin"),
    deleteLocation
  );

export default router;