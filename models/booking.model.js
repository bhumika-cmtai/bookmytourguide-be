// models/booking.model.js

import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      // --- YEH BADLAAV KIYA GAYA HAI ---
      // "AdminPackage" ko "Package" se badal diya gaya hai
      ref: "Package",
      required: true,
    },
    guide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guide", // Reference to your guide model
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the user who booked
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    numberOfTourists: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true },
    advanceAmount: { type: Number, required: true },
    paymentId: { type: String, required: true }, // From payment gateway
    status: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled"],
      default: "Upcoming",
    },
    paymentStatus: {
      type: String,
      enum: ["Advance Paid", "Fully Paid", "Refunded"],
      default: "Advance Paid",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);
