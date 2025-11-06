// routes/language.routes.js
import express from "express";
import {
  createLanguage,
  getAllLanguages,
  getLanguageById,
  updateLanguage,
  deleteLanguage,
} from "../controllers/language.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- PUBLIC ROUTES (No Auth Needed) ---
router.get("/", getAllLanguages);
router.get("/:id", getLanguageById);

// --- ADMIN ONLY ROUTES (Protected) ---
router.post("/", protect, authorize("admin"), createLanguage);

router
  .route("/:id")
  .put(protect, authorize("admin"), updateLanguage)
  .delete(protect, authorize("admin"), deleteLanguage);

export default router;