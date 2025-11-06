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
    extraCharge: {
      type: Number,
      required: [true, "Extra charge is required"],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Language = mongoose.model("Language", languageSchema);
export default Language;