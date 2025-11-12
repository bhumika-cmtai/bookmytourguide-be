// routes/tourguidebook.routes.js
import express from "express";
import {
  createBookingOrder,
  verifyAndCreateBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
  createFinalPaymentOrder,      
  verifyFinalPayment,
  cancelBookingAndProcessRefund, 
} from "../controllers/TourGuideBooking.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// User routes
router.post("/create-order", createBookingOrder);
router.post("/verify-and-create", protect, verifyAndCreateBooking);

// --- Step 2: Final Payment Routes ---
// Ek specific booking ke liye final payment order banayega
router.post("/:id/create-final-order", protect, createFinalPaymentOrder);
// Final payment ko verify karega
router.post("/:id/verify-final-payment", protect, verifyFinalPayment);


// --- Booking Management Routes ---
router.post("/:id/cancel", protect, cancelBookingAndProcessRefund);
router.get("/:id", protect, getBookingById);

// --- Admin Routes ---
router.get("/all", protect, getAllBookings);
router.patch("/:id/status", protect, updateBookingStatus);
router.delete("/:id", protect, deleteBooking);

export default router;