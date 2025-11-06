import Testimonial from "../models/testimonial.model.js";
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
    const testimonialData = { ...req.body };
    if (req.file) {
      // multer-s3 provides 'location' which is the public URL of the uploaded file
      testimonialData.video = req.file.location;
    }
    const testimonial = new Testimonial(testimonialData);
    await testimonial.save();
    res.status(201).json({
      success: true,
      message: "Testimonial created successfully",
      data: testimonial,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ Update testimonial (UPDATED for S3)
export const updateTestimonial = async (req, res) => {
  try {
    const updateData = { ...req.body };
    const oldTestimonial = await Testimonial.findById(req.params.id);

    if (req.file) {
      updateData.video = req.file.location;
      // If there was an old video, delete it from S3
      if (oldTestimonial && oldTestimonial.video) {
        const oldKey = new URL(oldTestimonial.video).pathname.substring(1);
        s3.deleteObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: oldKey,
        }).promise();
      }
    }

    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!testimonial)
      return res.status(404).json({ success: false, message: "Testimonial not found" });

    res.status(200).json({ /* ... */ });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ Delete testimonial (UPDATED for S3)
export const deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial)
      return res.status(404).json({ success: false, message: "Testimonial not found" });

    // Delete the associated video from S3
    if (testimonial.video) {
      const key = new URL(testimonial.video).pathname.substring(1); // Extracts 'testimonials/...' from the full URL
      await s3.deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }).promise();
    }
    res.status(200).json({ success: true, message: "Testimonial deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};