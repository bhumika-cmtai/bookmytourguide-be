import express from "express";
import {
  getAllBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blog.controller.js";

const router = express.Router();

/**
 * @route   GET /api/blogs
 * @desc    Get all blogs (supports pagination & search)
 * @access  Public
 */
router.get("/", getAllBlogs);

/**
 * @route   GET /api/blogs/:id
 * @desc    Get blog by ID
 * @access  Public
 */
router.get("/:id", getBlogById);

/**
 * @route   GET /api/blogs/slug/:slug
 * @desc    Get blog by slug
 * @access  Public
 */
router.get("/slug/:slug", getBlogBySlug);

/**
 * @route   POST /api/blogs
 * @desc    Create new blog
 * @access  Admin
 */
router.post("/", createBlog);

/**
 * @route   PUT /api/blogs/:id
 * @desc    Update blog
 * @access  Admin
 */
router.put("/:id", updateBlog);

/**
 * @route   DELETE /api/blogs/:id
 * @desc    Delete blog
 * @access  Admin
 */
router.delete("/:id", deleteBlog);

export default router;
