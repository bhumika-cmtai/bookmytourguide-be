import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Configure the S3 client
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_S3_REGION,
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Create a more organized folder structure in S3 based on field name
      let folder;
      
      if (file.fieldname === 'photo') {
        folder = 'guides/photos';
      } else if (file.fieldname === 'license') {
        folder = 'guides/licenses';
      } else if (file.fieldname === 'video') {
        folder = 'testimonials/videos';
      } else if (file.fieldname === 'images') {
        folder = 'packages/images';
      // ✅ FIX: Add a condition to handle the 'image' fieldname for locations
      } else if (file.fieldname === 'image') { 
        folder = 'locations/images';
      }
      else {
        folder = 'uploads'; // fallback
      }
      
      const fileName = `${folder}/${Date.now().toString()}${path.extname(
        file.originalname
      )}`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Define allowed types based on field name
    console.log("file.fieldname", file.fieldname)
    if (file.fieldname === 'photo') {
      const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
      const mimetype = allowedImageTypes.test(file.mimetype);
      const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
      
      if (mimetype && extname) {
        return cb(null, true);
      }
      return cb(new Error("Error: Only image files are allowed for photos."));
      
    } else if (file.fieldname === 'license') {
      const allowedLicenseTypes = /jpeg|jpg|png|pdf/;
      const mimetype = allowedLicenseTypes.test(file.mimetype);
      const extname = allowedLicenseTypes.test(path.extname(file.originalname).toLowerCase());
      
      if (mimetype && extname) {
        return cb(null, true);
      }
      return cb(new Error("Error: Only images or PDFs are allowed for licenses."));
      
    } else if (file.fieldname === 'video') {
      const allowedVideoTypes = /mp4|mov|avi|webm|mkv/;
      const videoMimeTypes = /video\/(mp4|quicktime|x-msvideo|webm|x-matroska)/;
      const mimetype = videoMimeTypes.test(file.mimetype);
      const extname = allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());
      
      if (mimetype && extname) {
        return cb(null, true);
      }
      return cb(new Error("Error: Only video files (MP4, MOV, WEBM, etc.) are allowed."));

    } else if (file.fieldname === 'images') {
        const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = allowedImageTypes.test(file.mimetype);
        const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
          return cb(null, true); 
        }
        return cb(new Error("Error: Only image files (jpeg, jpg, png, gif, webp) are allowed for package images."));
    
    // ✅ FIX: Add the file filter logic for the 'image' fieldname
    } else if (file.fieldname === 'image') {
        const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = allowedImageTypes.test(file.mimetype);
        const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
          return cb(null, true); // Allow upload
        }
        return cb(new Error("Error: Only image files are allowed for location images."));
    }
    
    else {
      // For any other field, reject
      console.log("Error: Unsupported field type")
      return cb(new Error("Error: Unsupported field type."));
    }
  },
});

export { upload };