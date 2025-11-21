import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    category: { type: String, trim: true },
    subject: { type: String, trim: true },
    phone: { type: String },
    nationality: { type: String, trim: true },
    message: { type: String },
    source: { type: String, default: "Website" },
    status: {
      type: String,
      enum: ["new", "contacted", "converted", "closed"],
      default: "new",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
