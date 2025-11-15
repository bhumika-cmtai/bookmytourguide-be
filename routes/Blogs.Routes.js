import express from "express";
import {
  getAllBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blog.controller.js";
import { upload } from "../middleware/s3.uploads.js";

const router = express.Router();

/** GET ALL */
router.get("/", getAllBlogs);

/** SLUG route ALWAYS before ID route */
router.get("/slug/:slug", getBlogBySlug);

/** GET BY ID */
router.get("/:id", getBlogById);

/** CREATE */
router.post("/", upload.single("thumbnail"), createBlog);

/** UPDATE */
router.put("/:id", upload.single("thumbnail"), updateBlog);

/** DELETE */
router.delete("/:id", deleteBlog);

export default router;
