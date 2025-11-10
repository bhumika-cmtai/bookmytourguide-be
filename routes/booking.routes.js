import express from "express";
import { createBooking, createRazorpayOrder, verifyPaymentAndCreateBooking,
    getAllBookings,
    getBookingById,
    getMyBookings,
    updateBookingStatus,
    deleteBooking
 } from "../controllers/booking.controller.js";
import { protect } from "../middleware/authMiddleware.js"; // Your JWT protection middleware

const router = express.Router();

router.post("/create", protect, createBooking);
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPaymentAndCreateBooking)
// --- READ Routes ---
router.get('/', protect, getAllBookings);

router.get('/my-bookings',protect ,getMyBookings);

router.get('/:id',protect ,getBookingById);


router.patch('/:id/status',protect ,updateBookingStatus);


router.delete('/:id',protect ,deleteBooking);



export default router;