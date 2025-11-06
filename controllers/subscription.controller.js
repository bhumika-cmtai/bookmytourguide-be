// controllers/subscription.controller.js
import Subscription from "../models/Subscription.Model.js";

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