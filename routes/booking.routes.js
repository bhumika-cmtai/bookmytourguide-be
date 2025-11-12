// routes/booking.routes.js

import express from "express";
import {
  createRazorpayOrder,
  verifyPaymentAndCreateBooking,
  createRemainingPaymentOrder,
  verifyRemainingPayment,
  getAllBookings,
  getBookingById,
  getMyBookings,
  updateBookingStatus,
  deleteBooking,
  getGuideBookings,
  cancelAndRefundBooking,
  assignSubstituteGuide,
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- PAYMENT & CREATION ---
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPaymentAndCreateBooking);
router.post("/:id/create-remaining-order", protect, createRemainingPaymentOrder);
router.post("/:id/verify-remaining-payment", protect, verifyRemainingPayment);

// --- SPECIFIC GET Routes (Specific routes pehle aane chahiye) ---
router.get("/my-bookings", protect, getMyBookings);
router.get("/guide-bookings", protect, getGuideBookings);

// --- GENERAL GET Route ---
router.get("/", protect, getAllBookings);

// --- UPDATE & ACTION Routes ---
router.patch("/:id/status", protect, updateBookingStatus);
router.post("/:id/cancel", protect, cancelAndRefundBooking);
router.patch("/:id/assign-substitute", protect, assignSubstituteGuide);

// --- DELETE Route ---
router.delete("/:id", protect, deleteBooking);

// --- DYNAMIC ID GET ROUTE (Yeh hamesha AAKHIR mein hona chahiye) ---
router.get("/:id", protect, getBookingById);

export default router;