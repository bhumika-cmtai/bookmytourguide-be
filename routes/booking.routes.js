import express from "express";
import { createBooking, createRazorpayOrder, verifyPaymentAndCreateBooking } from "../controllers/booking.controller.js";
import { protect } from "../middleware/authMiddleware.js"; // Your JWT protection middleware

const router = express.Router();

router.post("/create", protect, createBooking);
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPaymentAndCreateBooking)

export default router;