// models/Subscription.Model.js
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Plan title is required"],
      trim: true,
      unique: true,
    },
    duration: {
      type: String,
      required: [true, "Plan duration is required"],
      trim: true,
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
    },
    monthlyPrice: {
      type: Number,
      required: [true, "Monthly price is required"],
    },
    benefits: {
      type: [String],
      required: [true, "Benefits are required"],
    },
    popular: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;