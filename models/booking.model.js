// models/booking.model.js

import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    guide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guide", // Yeh current/assigned guide hai
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    numberOfTourists: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true },
    advanceAmount: { type: Number, required: true },
    paymentId: { type: String, required: true },
    status: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled", "Awaiting Substitute"], // Naya status add kiya gaya
      default: "Upcoming",
    },
    paymentStatus: {
      type: String,
      enum: ["Advance Paid", "Fully Paid", "Refunded"],
      default: "Advance Paid",
    },
    cancelledBy: {
      cancellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      cancellerRole: {
        type: String,
        enum: ["user", "guide", "admin"],
      },
      cancellerName: {
        type: String,
      },
    },
    originalGuide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guide",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);