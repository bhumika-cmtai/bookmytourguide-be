import mongoose from "mongoose";

const customTourRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    selectedLocations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    ],
    selectedLanguage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },
    dateRange: { from: { type: Date }, to: { type: Date } },
    numTravelers: { type: Number, required: true, min: 1 },
    preferredMonuments: { type: String, trim: true },
    needsLunch: { type: Boolean, default: false },
    needsDinner: { type: Boolean, default: false },
    needsStay: { type: Boolean, default: false },
    acknowledged: {
      type: Boolean,
      required: true,
      validate: {
        validator: (v) => v === true,
        message: "You must acknowledge the terms.",
      },
    },
    status: {
      type: String,
      enum: ["Pending", "Quoted", "Booked", "Rejected"],
      default: "Pending",
    },
    quoteAmount: { type: Number, default: 0 },
    adminComment: { type: String, trim: true },

  },
  { timestamps: true }
);

const CustomTourRequest =
  mongoose.models.CustomTourRequest ||
  mongoose.model("CustomTourRequest", customTourRequestSchema);

export default CustomTourRequest;
