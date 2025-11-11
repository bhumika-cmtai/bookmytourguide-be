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
  getGuideBookings, // <-- Naya function import karein
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

// --- YEH NAYA ROUTE ADD KIYA GAYA HAI ---
// Yeh zaroori hai ki yeh dynamic '/:id' route se pehle aaye
router.get("/guide-bookings", protect, getGuideBookings);

// --- UPDATE Route ---
router.patch("/:id/status", protect, updateBookingStatus);

// --- DELETE Route ---
router.delete("/:id", protect, deleteBooking);

// --- DYNAMIC ID ROUTE (sabse aakhir mein) ---
router.get("/:id", protect, getBookingById);

export default router;
