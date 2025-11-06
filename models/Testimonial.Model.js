import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    image: { type: String },
    position: { type: String }, // e.g., "Traveler", "Customer"
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Testimonial", testimonialSchema);
