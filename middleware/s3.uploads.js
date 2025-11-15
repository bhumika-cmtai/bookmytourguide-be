import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ------------------------------
// S3 Client
// ------------------------------
const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ------------------------------
// Allowed File Types
// ------------------------------
const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
const allowedVideoTypes = /mp4|mov|avi|mkv/;

// ------------------------------
// Multer S3 Storage
// ------------------------------
const storage = multerS3({
  s3,
  bucket: process.env.AWS_BUCKET_NAME,
  // acl: "public-read",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    let folder = "others";

    if (file.fieldname === "photo") folder = "photos";
    else if (file.fieldname === "license") folder = "licenses";
    else if (file.fieldname === "video") folder = "videos";
    else if (file.fieldname === "images") folder = "images";
    else if (file.fieldname === "image") folder = "image";
    else if (file.fieldname === "thumbnail") folder = "thumbnails"; // ⭐ ADDED FIX

    const fileName = `${folder}/${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${fileExtension}`;

    cb(null, fileName);
  },
});

// ------------------------------
// File Filter
// ------------------------------
const fileFilter = (req, file, cb) => {
  console.log("File field:", file.fieldname);

  // ---------------- IMAGE VALIDATION ----------------
  const isImage =
    allowedImageTypes.test(file.mimetype) &&
    allowedImageTypes.test(path.extname(file.originalname).toLowerCase());

  // ---------------- VIDEO VALIDATION ----------------
  const isVideo =
    allowedVideoTypes.test(file.mimetype) &&
    allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());

  // PHOTO
  if (file.fieldname === "photo") {
    return isImage
      ? cb(null, true)
      : cb(new Error("Only image files allowed for photo."));
  }

  // LICENSE
  if (file.fieldname === "license") {
    return isImage
      ? cb(null, true)
      : cb(new Error("Only image files allowed for license."));
  }

  // VIDEO
  if (file.fieldname === "video") {
    return isVideo
      ? cb(null, true)
      : cb(new Error("Only video files allowed for video."));
  }

  // MULTIPLE IMAGES
  if (file.fieldname === "images") {
    return isImage
      ? cb(null, true)
      : cb(new Error("Only image files allowed for gallery images."));
  }

  // GENERAL IMAGE (if used)
  if (file.fieldname === "image") {
    return isImage
      ? cb(null, true)
      : cb(new Error("Only image files allowed for image."));
  }

  // ⭐ BLOG THUMBNAIL (MAIN FIX)
  if (file.fieldname === "thumbnail") {
    return isImage
      ? cb(null, true)
      : cb(new Error("Only image files allowed for blog thumbnail."));
  }

  // Unsupported field
  console.log("Error: Unsupported field type:", file.fieldname);
  return cb(new Error("Unsupported field type."));
};

// ------------------------------
// Multer Export
// ------------------------------
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
