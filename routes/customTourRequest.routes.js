import express from "express";
import {
  getFormData,
  createCustomTourRequest,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  deleteRequest,
  getMyRequests,
} from "../controllers/customTourRequest.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/form-data", getFormData);
router.get("/my-requests", protect, getMyRequests);

router.get("/", protect, getAllRequests);
router.post("/", protect, createCustomTourRequest);

router.get("/:id", protect, getRequestById);
router.patch("/:id/status", protect, updateRequestStatus);
router.delete("/:id", protect, deleteRequest);

export default router;
