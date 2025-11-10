// controllers/subscription.controller.js
import Subscription from "../models/Subscription.Model.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import Guide from "../models/guides.model.js"; // Correct path to your guide model
import User from "../models/Users.Model.js";


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create a new subscription plan
// @route   POST /api/subscriptions
// @access  Private/Admin
export const createSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.create(req.body);
    res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      data: subscription,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all subscription plans
// @route   GET /api/subscriptions
// @access  Public
export const getAllSubscriptions = async (req, res) => {
  try {
    // Sort plans by price so cheaper ones appear first
    const subscriptions = await Subscription.find({}).sort({ totalPrice: 1 });
    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single subscription plan by ID
// @route   GET /api/subscriptions/:id
// @access  Public
export const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription plan not found" });
    }
    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a subscription plan
// @route   PUT /api/subscriptions/:id
// @access  Private/Admin
export const updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription plan not found" });
    }
    res.status(200).json({
      success: true,
      message: "Subscription plan updated successfully",
      data: subscription,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a subscription plan
// @route   DELETE /api/subscriptions/:id
// @access  Private/Admin
export const deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription plan not found" });
    }
    res.status(200).json({ success: true, message: "Subscription plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: "Plan ID is required" });
    }

    const plan = await Subscription.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Subscription plan not found" });
    }

    const options = {
      amount: plan.totalPrice * 100, // Amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      data: { // <--- WRAP a 'data' object here
        order,
        key_id: process.env.RAZORPAY_KEY_ID,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Verify payment and update guide profile
// @route   POST /api/payments/verify-payment
// @access  Private (Guide)
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planId,
  } = req.body;
  
  const guideUserId = req.user.id; // From 'protect' middleware

  try {
    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid Signature" });
    }

    // 2. Find the Plan and Guide
    const plan = await Subscription.findById(planId);
    const guide = await Guide.findOne({ user: guideUserId });

    if (!plan || !guide) {
      return res.status(404).json({ success: false, message: "Plan or Guide not found" });
    }

    // 3. Calculate Expiration Date
    const expirationDate = new Date();
    const durationInMonths = parseInt(plan.duration.split(" ")[0]); // e.g., "6 Months" -> 6
    expirationDate.setMonth(expirationDate.getMonth() + durationInMonths);

    // 4. Update Guide Profile
    guide.isCertified = true;
    guide.subscriptionId = razorpay_payment_id;
    guide.subscriptionPlan = plan.title;
    guide.subscriptionExpiresAt = expirationDate;
    
    await guide.save();
    
    // Also update the user model to reflect certified status
    await User.findByIdAndUpdate(guideUserId, { isCertified: true });


    res.status(200).json({
      success: true,
      message: "Payment successful! Your guide profile is now certified.",
      data: { // <--- WRAP the payload here
        guide,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

