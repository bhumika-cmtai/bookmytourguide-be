import mongoose from "mongoose";

const guideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Basic info
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    dob: { type: Date },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    age: { type: Number },

    // Professional info
    languages: [{ type: String, trim: true }], // ✅ CHANGED: Store language names directly
    serviceLocations: [{ type: String, trim: true }],
    experience: { type: String, trim: true },
    specializations: [{ type: String, trim: true }],
    // availability: [{ type: String, trim: true }],
    unavailableDates: [{ type: Date }],
    // hourlyRate: { type: Number, default: 0 },
    description: { type: String, trim: true },

    // Documents and media
    license: { type: String }, // License document/image URL
    photo: { type: String }, // Profile picture

    // Availability / booking logic
    isBooked: { type: Boolean, default: false },
    currentBooking: {
      from: { type: Date },
      to: { type: Date },
    },

    // ✅ Admin approval system
    isApproved: {
      type: Boolean,
      default: false, // set true only when approved by admin
    },
    isCertified: {
      type: Boolean,
      default: false, // Becomes true after successful subscription
    },
    subscriptionId: {
      type: String, // To store the Razorpay payment ID
      trim: true,
    },
    subscriptionPlan: {
      type: String, // e.g., "Pro", "Partner"
      trim: true,
    },
    subscriptionExpiresAt: {
      type: Date, // The date when the certification expires
    },
    originalGuide: { type: mongoose.Schema.Types.ObjectId, ref: "Guide" }, 

    profileComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Guide || mongoose.model("Guide", guideSchema);

