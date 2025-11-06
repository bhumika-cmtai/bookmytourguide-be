import multer from "multer";
import path from "path";
import fs from "fs";

// Create folders if not exist
const photoDir = "uploads/photos";
const licenseDir = "uploads/licenses";
[photoDir, licenseDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "photo") cb(null, photoDir);
    else if (file.fieldname === "license") cb(null, licenseDir);
    else cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

// File type filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "photo") {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed for photo!"), false);
  } else if (file.fieldname === "license") {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF allowed for license!"), false);
  } else cb(null, false);
};

export const upload = multer({ storage, fileFilter });
