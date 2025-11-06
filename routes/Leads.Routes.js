import express from "express";
import {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
} from "../controllers/lead.controller.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/leads
 * @desc    Get all leads (supports pagination & search)
 * @access  Protected (admin, guide, manager)
 */
router.get("/", protect, authorize("admin", "guide", "manager"), getAllLeads);

/**
 * @route   GET /api/leads/:id
 * @desc    Get a single lead by ID
 * @access  Protected (admin, guide, manager)
 */
router.get("/:id", protect, authorize("admin", "guide", "manager"), getLeadById);

/**
 * @route   POST /api/leads
 * @desc    Create a new lead
 * @access  Protected (admin, guide, manager)
 */
router.post("/", protect, authorize("admin", "guide", "manager"), createLead);

/**
 * @route   PUT /api/leads/:id
 * @desc    Update lead
 * @access  Protected (admin, guide, manager)
 */
router.put("/:id", protect, authorize("admin", "guide", "manager"), updateLead);

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete lead
 * @access  Protected (admin, guide, manager)
 */
router.delete("/:id", protect, authorize("admin", "guide", "manager"), deleteLead);

export default router;
