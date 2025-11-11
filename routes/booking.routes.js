// routes/booking.routes.js

import express from "express";
import {
  createBooking,
  createRazorpayOrder,
  verifyPaymentAndCreateBooking,
  getAllBookings,
  getBookingById,
  getMyBookings,
  updateBookingStatus,
  deleteBooking,
  getGuideBookings,
  cancelAndRefundBooking,
  assignSubstituteGuide, // Naya function import kiya
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- CREATE Routes ---
router.post("/create", protect, createBooking);
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPaymentAndCreateBooking);

// --- READ Routes ---
router.get("/", protect, getAllBookings);
router.get("/my-bookings", protect, getMyBookings);
router.get("/guide-bookings", protect, getGuideBookings);

// --- UPDATE Routes ---
router.patch("/:id/status", protect, updateBookingStatus);
router.post("/:id/cancel", protect, cancelAndRefundBooking);

// --- Naya Substitute Guide Route (sirf Admin ke liye) ---
router.patch("/:id/assign-substitute", protect, assignSubstituteGuide);

// --- DELETE Route ---
router.delete("/:id", protect, deleteBooking);

// --- DYNAMIC ID ROUTE (hamesha aakhir mein) ---
router.get("/:id", protect, getBookingById);

export default router;