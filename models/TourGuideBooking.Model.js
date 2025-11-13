// models/TourGuideBooking.model.js
import mongoose from "mongoose";

const tourGuideBookingSchema = new mongoose.Schema(
  {
    guide: { type: mongoose.Schema.Types.ObjectId, ref: "Guide", required: true },
    originalGuide:  { type: mongoose.Schema.Types.ObjectId, ref: "Guide" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String, required: true, trim: true },
    language: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    numberOfTravelers: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true },
    advanceAmount: { type: Number, required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    status: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled"],
      default: "Upcoming",
    },
    remainingAmount: { type: Number, required: true },
    reminderSent: { 
      type: Boolean, 
      default: false 
    },
    reminderSentAt: { 
      type: Date, 
      default: null 
    },

    paymentStatus: {
      type: String,
      enum: ["Advance Paid", "Fully Paid", "Refunded"],
      default: "Advance Paid",
    },
    finalPaymentRazorpayOrderId: { type: String },
    finalPaymentRazorpayPaymentId: { type: String },
    contactInfo: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    // ✅ NAYE FIELDS cancellation aur refund ko track karne ke liye
    cancelledBy: {
      type: String,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    razorpayRefundId: {
      type: String, // Razorpay se mili refund ID ko store karne ke liye
    }
  },
  {
    timestamps: true,
  }
);

const TourGuideBooking = mongoose.model("TourGuideBooking", tourGuideBookingSchema);
export default TourGuideBooking;