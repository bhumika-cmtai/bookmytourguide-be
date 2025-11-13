// models/Package.Model.js
import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Package title is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    basePrice: {
      type: Number,
      required: [true, "Base price (strikethrough price) is required"],
    },
    duration: {
      type: String,
      required: [true, "Duration is required"],
    },
    locations: {
      type: [String],
      required: true,
    },
    images: {
      type: [String],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  
  },
  {
    timestamps: true,
  }
);

const Package = mongoose.model("Package", packageSchema);
export default Package;