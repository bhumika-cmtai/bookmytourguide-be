// models/Location.Model.js
import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    placeName: {
      type: String,
      required: [true, "Place name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Image URL is required"],
    },
    pricing: {
      smallGroup: {
        price: { type: Number}
      },
      mediumGroup: {
        price: { type: Number }
      },
      largeGroup: {
        price: { type: Number }
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Location = mongoose.model("Location", locationSchema);
export default Location;