import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3"; // 🔥 CHANGED: Import S3Client from v3
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Configure the S3 client using AWS SDK v3
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_S3_REGION,
});

// console.log("AWS_BUCKET_NAME", process.env.AWS_BUCKET_NAME)

const upload = multer({
  storage: multerS3({
    s3: s3, // Pass the new S3Client
    bucket: process.env.AWS_BUCKET_NAME,
    // acl: "public-read",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const folder = "locations"; // Aap yahan dynamic folder bhi bana sakte hain
      const fileName = `${folder}/${Date.now().toString()}${path.extname(
        file.originalname
      )}`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb("Error: File type not supported.");
  },
});

export { upload };