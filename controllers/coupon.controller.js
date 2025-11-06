import Coupon from "../models/Coupons.Model.js";

// ✅ Create a new coupon
export const createCoupon = async (req, res) => {
  try {
    const coupon = new Coupon(req.body);
    await coupon.save();
    res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ Get all coupons with pagination and search
export const getAllCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = {
      code: { $regex: search, $options: "i" },
    };

    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Coupon.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: coupons,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get coupon by ID
export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update coupon
export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    res.status(200).json({ success: true, message: "Coupon updated successfully", data: coupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ✅ Delete coupon
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Validate coupon code
export const validateCoupon = async (req, res) => {
  try {
    const { code, purchaseAmount } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ success: false, message: "Invalid or expired coupon" });

    if (coupon.expiryDate < new Date()) {
      coupon.isActive = false;
      await coupon.save();
      return res.status(400).json({ success: false, message: "Coupon has expired" });
    }

    if (coupon.usageCount >= coupon.maxUsage) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    }

    if (purchaseAmount < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase amount should be ₹${coupon.minPurchase}`,
      });
    }

    // Apply discount logic
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (purchaseAmount * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      discountAmount,
      coupon,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
