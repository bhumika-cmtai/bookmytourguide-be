import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "user", "guide", "manager"],
      default: "user",
    },
    mobile: { type: String },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },

    guideProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guide",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
