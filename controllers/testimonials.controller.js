import Testimonial from "../models/Testimonial.Model.js";
import aws from "aws-sdk";

// Configure S3 client for deletion
const s3 = new aws.S3({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_S3_REGION,
});

// ✅ Get all testimonials with pagination, search, and visibility filter
export const getAllTestimonials = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", visible } = req.query;
    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
      ],
    };
    if (visible !== undefined) {
      query.isVisible = visible === "true";
    }
    const testimonials = await Testimonial.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Testimonial.countDocuments(query);
    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: testimonials,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get testimonial by ID
export const getTestimonialById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial)
      return res
        .status(404)
        .json({ success: false, message: "Testimonial not found" });
    res.status(200).json({ success: true, data: testimonial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTestimonial = async (req, res) => {
  try {
    console.log("📝 Creating testimonial...");
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const testimonialData = { ...req.body };
    
    // If a file was uploaded, use its S3 location
    if (req.file && req.file.location) {
      testimonialData.video = req.file.location;
      console.log("✅ Video uploaded to:", req.file.location);
    } else {
      console.log("⚠️ No file uploaded");
      delete testimonialData.video;
    }

    const testimonial = new Testimonial(testimonialData);
    await testimonial.save();
    
    console.log("✅ Testimonial created:", testimonial._id);
    
    res.status(201).json({
      success: true,
      message: "Testimonial created successfully",
      data: testimonial,
    });
  } catch (error) {
    console.error("❌ Error creating testimonial:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTestimonial = async (req, res) => {
  try {
    console.log("📝 Updating testimonial:", req.params.id);
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const updateData = { ...req.body };
    const oldTestimonial = await Testimonial.findById(req.params.id);

    if (!oldTestimonial) {
      return res.status(404).json({ success: false, message: "Testimonial not found" });
    }

    // If a new file is uploaded, update the video URL
    if (req.file && req.file.location) {
      updateData.video = req.file.location;
      console.log("✅ New video uploaded to:", req.file.location);
      
      // If there was an old video, delete it from S3
      if (oldTestimonial.video) {
        try {
          const oldKey = new URL(oldTestimonial.video).pathname.substring(1);
          await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: oldKey,
          }).promise();
          console.log("🗑️ Old video deleted:", oldKey);
        } catch (deleteError) {
          console.error("⚠️ Error deleting old video:", deleteError);
          // Continue anyway - the update is more important
        }
      }
    } else {
      console.log("ℹ️ No new video file uploaded");
      // If no new file is being uploaded and video field exists as empty/invalid, remove it
      if (updateData.video !== undefined && typeof updateData.video !== 'string') {
        delete updateData.video;
      }
      // If video is empty string, don't update it (keep existing)
      if (updateData.video === '') {
        delete updateData.video;
      }
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log("✅ Testimonial updated:", testimonial._id);

    res.status(200).json({
      success: true,
      message: "Testimonial updated successfully",
      data: testimonial,
    });
  } catch (error) {
    console.error("❌ Error updating testimonial:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ Delete testimonial (UPDATED for S3 video deletion)
export const deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial)
      return res.status(404).json({ success: false, message: "Testimonial not found" });

    // Delete the associated video from S3
    if (testimonial.video) {
      try {
        const key = new URL(testimonial.video).pathname.substring(1);
        await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        }).promise();
        console.log("🗑️ Video deleted from S3:", key);
      } catch (deleteError) {
        console.error("⚠️ Error deleting video from S3:", deleteError);
        // Continue anyway - testimonial is already deleted
      }
    }

    res.status(200).json({ success: true, message: "Testimonial deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting testimonial:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};