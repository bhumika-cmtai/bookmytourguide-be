// routes/subscription.routes.js
import express from "express";
import {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  createOrder,
  verifyPayment
} from "../controllers/subscription.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- PUBLIC ROUTES (No Auth Needed) ---
// Anyone can view subscription plans
router.get("/", getAllSubscriptions);
router.get("/:id", getSubscriptionById);

// --- ADMIN ONLY ROUTES (Protected) ---
// Only an admin can create, update, or delete plans
router.post("/", protect, authorize("admin"), createSubscription);

router
  .route("/:id")
  .put(protect, authorize("admin"), updateSubscription)
  .delete(protect, authorize("admin"), deleteSubscription);

router.post("/create-order", protect, createOrder);
router.post("/verify-payment", protect, verifyPayment);
  

export default router;