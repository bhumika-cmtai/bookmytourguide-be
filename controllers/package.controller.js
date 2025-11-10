// controllers/package.controller.js
import Package from "../models/Package.Model.js";
import dotenv from "dotenv";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

dotenv.config();

// S3 client configure karein
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_S3_REGION,
});
const getS3KeyFromUrl = (url) => {
  try {
    return new URL(url).pathname.substring(1);
  } catch (error) {
    console.error("Invalid URL for S3 key extraction:", url);
    return null;
  }
};

// @desc    Create a new package
// @route   POST /api/admin/packages
// @access  Private/Admin
export const createPackage = async (req, res) => {
  try {
    const packageData = { ...req.body };
    console.log("package data ",packageData)
    
    // req.files (plural) ek array hoga
    if (req.files && req.files.length > 0) {
      packageData.images = req.files.map((file) => file.location); // 'location' is the S3 URL
    } else {
      packageData.images = []; // Ensure images is an array even if no files are uploaded
    }
    
    const newPackage = await Package.create(packageData);
    res.status(201).json({
      success: true,
      message: "Package created successfully",
      data: newPackage,
    });
  } catch (error) {
    console.log(error)
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all packages
// @route   GET /api/admin/packages
// @access  Private/Admin
export const getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single package by ID
// @route   GET /api/admin/packages/:id
// @access  Private/Admin
export const getPackageById = async (req, res) => {
  try {
    const tourPackage = await Package.findById(req.params.id);
    if (!tourPackage) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }
    res.status(200).json({ success: true, data: tourPackage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a package
// @route   PUT /api/admin/packages/:id
// @access  Private/Admin
export const updatePackage = async (req, res) => {
  try {
    const packageToUpdate = await Package.findById(req.params.id);
    if (!packageToUpdate) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }
    
    const updateData = { ...req.body };

    let imagesToKeep = req.body.existingImages || [];
    if (typeof imagesToKeep === 'string') {
        imagesToKeep = [imagesToKeep];
    }

    const newImageUrls = req.files ? req.files.map((file) => file.location) : [];
    updateData.images = [...imagesToKeep, ...newImageUrls];

    const imagesToDelete = packageToUpdate.images.filter(
      (img) => !imagesToKeep.includes(img)
    );

    if (imagesToDelete.length > 0) {
      const keysToDelete = imagesToDelete.map(getS3KeyFromUrl).filter(key => key);
      if (keysToDelete.length > 0) {
          // ✅ FIX: Use the correct AWS SDK v3 syntax here as well
          const deleteCommand = new DeleteObjectsCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Delete: { Objects: keysToDelete.map(key => ({ Key: key })) },
          });
          await s3.send(deleteCommand);
      }
    }

    const updatedPackage = await Package.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Package updated successfully",
      data: updatedPackage,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a package
// @route   DELETE /api/admin/packages/:id
// @access  Private/Admin
export const deletePackage = async (req, res) => {
  try {
    const packageToDelete = await Package.findByIdAndDelete(req.params.id);
    if (!packageToDelete) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    // Package ke saare images S3 se delete karein
    if (packageToDelete.images && packageToDelete.images.length > 0) {
      const keysToDelete = packageToDelete.images.map(getS3KeyFromUrl).filter(key => key);
      if (keysToDelete.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Delete: { Objects: keysToDelete.map(key => ({ Key: key })) },
          });
          await s3.send(deleteCommand);
      }
  }

    res.status(200).json({ success: true, message: "Package deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
