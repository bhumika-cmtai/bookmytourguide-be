import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from "../controllers/coupon.controller.js";

const router = express.Router();

// CRUD routes
router.get("/", getAllCoupons);
router.get("/:id", getCouponById);
router.post("/", createCoupon);
router.put("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);

// Extra route to validate a coupon code
router.post("/validate", validateCoupon);

export default router;
