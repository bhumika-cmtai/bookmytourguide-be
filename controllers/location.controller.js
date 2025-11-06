import Location from "../models/Location.Model.js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Configure the S3 client for v3
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_S3_REGION,
});

// ✅ FIX: Add this helper function at the top of the file
// This function takes a full S3 URL and extracts the "Key" (e.g., 'locations/12345.jpg')
const getS3KeyFromUrl = (url) => {
  try {
    return new URL(url).pathname.substring(1);
  } catch (error) {
    console.error("Invalid URL for S3 key extraction:", url);
    return null;
  }
};


// @desc    Create a new location
// @route   POST /api/locations
// @access  Private/Admin
export const createLocation = async (req, res) => {
  try {
    const locationData = { ...req.body };

    if (req.file) {
      locationData.image = req.file.location; // S3 URL
    } else {
        return res.status(400).json({ success: false, message: "Image is required." });
    }

    const location = await Location.create(locationData);
    res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: location,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// @desc    Get all locations
// @route   GET /api/locations
// @access  Public
export const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single location by ID
// @route   GET /api/locations/:id
// @access  Public
export const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }
    res.status(200).json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a location
// @route   PUT /api/locations/:id
// @access  Private/Admin
export const updateLocation = async (req, res) => {
  try {
    const updateData = { ...req.body };
    const locationToUpdate = await Location.findById(req.params.id);

    if (!locationToUpdate) {
        return res.status(404).json({ success: false, message: "Location not found" });
    }
    
    // If a new image is uploaded
    if (req.file) {
      updateData.image = req.file.location; // Set the new S3 URL

      // Delete the old image from S3
      if (locationToUpdate.image) {
        const oldKey = getS3KeyFromUrl(locationToUpdate.image);
        if (oldKey) {
            // ✅ FIX: Use the correct AWS SDK v3 syntax for deletion
            const deleteCommand = new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: oldKey,
            });
            await s3.send(deleteCommand);
        }
      }
    }

    const location = await Location.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    
    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a location
// @route   DELETE /api/locations/:id
// @access  Private/Admin
export const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    if (location.image) {
      const key = getS3KeyFromUrl(location.image);
      if (key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        });
        await s3.send(deleteCommand);
      }
    }

    res.status(200).json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};