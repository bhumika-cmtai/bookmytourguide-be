// models/Language.Model.js
import mongoose from "mongoose";

const languageSchema = new mongoose.Schema(
  {
    languageName: {
      type: String,
      required: [true, "Language name is required"],
      trim: true,
      unique: true,
    },
    pricing: {
      // Price for 1-14 Persons
      standardGroup: {
        price: { type: Number}
      },
      // Price for 15 Persons Onwards
      largeGroup: {
        price: { type: Number}
      }
    },
  },
  {
    timestamps: true,
  }
);

const Language = mongoose.model("Language", languageSchema);
export default Language;