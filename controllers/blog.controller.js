import Blog from "../models/Blogs.Model.js";
import dotenv from "dotenv";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

// Configure S3 client
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_S3_REGION,
});

// Helper function to extract S3 key from a full URL
const getS3KeyFromUrl = (url) => {
  try {
    return new URL(url).pathname.substring(1);
  } catch (error) {
    console.error("Invalid URL for S3 key extraction:", url);
    return null;
  }
};


// --- READ OPERATIONS ---

export const getAllBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const filter = search ? { title: { $regex: search, $options: "i" } } : {};

    const total = await Blog.countDocuments(filter);
    const blogs = await Blog.find(filter)
      .populate("author", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: blogs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ ADDED BACK: Get a single blog by its ID
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("author", "name avatar");
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.json({ success: true, data: blog });
  } catch (error) {
    // This handles cases where the provided ID is not a valid MongoDB ObjectId format
    if (error.kind === 'ObjectId') {
         return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).populate("author", "name avatar");
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// --- WRITE OPERATIONS ---

export const createBlog = async (req, res) => {
  try {
    const { title, content, slug, tags, published, isFeatured } = req.body;

    if (!title || !content || !slug) {
      return res.status(400).json({ success: false, message: "Title, content, and slug are required." });
    }
    if (!req.file || !req.file.location) {
      return res.status(400).json({ success: false, message: "Thumbnail image is required." });
    }

    const newBlog = new Blog({
      title,
      slug,
      content,
      thumbnail: req.file.location,
      tags: tags ? JSON.parse(tags) : [],
      published: published === 'true',
      isFeatured: isFeatured === 'true',
      author: req.user?.id,
      publishedAt: published === 'true' ? new Date() : null,
    });

    const savedBlog = await newBlog.save();
    res.status(201).json({ success: true, data: savedBlog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { title, slug, content, tags, published, isFeatured } = req.body;
    
    const blogToUpdate = await Blog.findById(req.params.id);
    if (!blogToUpdate) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    const updateData = { title, slug, content, published: published === 'true', isFeatured: isFeatured === 'true' };
    if (tags) {
      updateData.tags = JSON.parse(tags);
    }

    if (req.file) {
      if (blogToUpdate.thumbnail) {
        const oldKey = getS3KeyFromUrl(blogToUpdate.thumbnail);
        if (oldKey) {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: oldKey,
          });
          await s3.send(deleteCommand);
        }
      }
      updateData.thumbnail = req.file.location;
    }
    
    if (published === 'true' && !blogToUpdate.published) {
        updateData.publishedAt = new Date();
    }

    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updatedBlog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const blogToDelete = await Blog.findById(req.params.id);
    if (!blogToDelete) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    if (blogToDelete.thumbnail) {
      const key = getS3KeyFromUrl(blogToDelete.thumbnail);
      if (key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        });
        await s3.send(deleteCommand);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// --- ADVANCED READ OPERATION ---

export const getFeaturedBlogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const featuredBlogs = await Blog.find({ isFeatured: true, published: true })
      .sort({ publishedAt: -1 })
      .limit(limit);
      
    const featuredIds = new Set(featuredBlogs.map(b => b._id.toString()));
    let resultBlogs = [...featuredBlogs];
    
    if (resultBlogs.length < limit) {
      const remainingLimit = limit - resultBlogs.length;
      const latestBlogs = await Blog.find({ 
        published: true, 
        _id: { $nin: Array.from(featuredIds) }
      })
      .sort({ publishedAt: -1 })
      .limit(remainingLimit);
      
      resultBlogs.push(...latestBlogs);
    }
    
    res.status(200).json({
      success: true,
      count: resultBlogs.length,
      data: resultBlogs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};