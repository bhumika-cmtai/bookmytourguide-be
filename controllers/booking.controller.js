import Booking from "../models/booking.model.js";
import Guide from "../models/Guides.Model.js";
import AdminPackage from "../models/Package.Model.js";
import Razorpay from "razorpay";
import crypto from "crypto";

// Helper function to get all dates between a start and end date
const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= new Date(endDate)) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

// --- BOOKING CREATION & ADVANCE PAYMENT ---

/**
 * @desc    Create a Razorpay order for advance payment
 * @route   POST /api/bookings/create-order
 * @access  Private
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const { amount, currency = "INR", receipt } = req.body;
    if (!amount || !receipt) {
      return res
        .status(400)
        .json({ success: false, message: "Amount and receipt are required." });
    }
    const options = { amount: Math.round(amount * 100), currency, receipt };
    const order = await instance.orders.create(options);
    if (!order) {
      return res
        .status(500)
        .json({ success: false, message: "Could not create Razorpay order." });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Verify advance payment and create a new booking
 * @route   POST /api/bookings/verify
 * @access  Private
 */
export const verifyPaymentAndCreateBooking = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      tourId,
      guideId,
      startDate,
      endDate,
      numberOfTourists,
    } = req.body;
    const userId = req.user.id;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed." });
    }

    const tour = await AdminPackage.findById(tourId);
    const guide = await Guide.findById(guideId);
    if (!tour || !guide) {
      return res
        .status(404)
        .json({ success: false, message: "Tour or Guide not found." });
    }

    const totalPrice = tour.price * parseInt(numberOfTourists);
    const advanceAmount = totalPrice * 0.2;
    const remainingAmount = totalPrice * 0.8;
    const bookingDates = getDatesInRange(startDate, endDate);

    const isAlreadyBooked = guide.unavailableDates.some((date) =>
      bookingDates.some((bDate) => bDate.getTime() === new Date(date).getTime())
    );
    if (isAlreadyBooked) {
      return res.status(409).json({
        success: false,
        message: "Sorry, the guide was booked while you were paying.",
      });
    }

    guide.unavailableDates.push(...bookingDates);
    await guide.save();

    const newBooking = new Booking({
      tour: tourId,
      guide: guideId,
      user: userId,
      startDate,
      endDate,
      numberOfTourists: parseInt(numberOfTourists),
      totalPrice,
      advanceAmount,
      remainingAmount,
      advancePaymentId: razorpay_payment_id,
      paymentStatus: "Advance Paid",
    });

    const savedBooking = await newBooking.save();
    res.status(201).json({
      success: true,
      message: "Booking confirmed successfully!",
      data: savedBooking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- REMAINING PAYMENT FLOW ---

/**
 * @desc    Create a Razorpay order for the remaining payment
 * @route   POST /api/bookings/:id/create-remaining-order
 * @access  Private
 */
export const createRemainingPaymentOrder = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }
    if (booking.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    if (booking.paymentStatus === "Fully Paid") {
      return res.status(400).json({ success: false, message: "Payment already completed." });
    }
    if (booking.status !== "Upcoming") {
      return res.status(400).json({ success: false, message: `Cannot pay for a booking with status '${booking.status}'.`});
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const options = {
      amount: Math.round(booking.remainingAmount * 100),
      currency: "INR",
      receipt: `receipt_remaining_${bookingId}`,
    };
    const order = await instance.orders.create(options);
    if (!order) {
      return res.status(500).json({ success: false, message: "Could not create payment order." });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.log("ERROR CREATING REMAINING PAYMENT ORDER:", error); 
      res.status(500).json({ 
      success: false, 
      message: error.message || "An internal server error occurred while creating the payment order." 
    });
  }
};

/**
 * @desc    Verify the remaining payment
 * @route   POST /api/bookings/:id/verify-remaining-payment
 * @access  Private
 */
export const verifyRemainingPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const bookingId = req.params.id;
    const userId = req.user.id;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }
    if (booking.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    booking.remainingPaymentId = razorpay_payment_id;
    booking.paymentStatus = "Fully Paid";
    await booking.save();
    res.status(200).json({
      success: true,
      message: "Remaining payment completed successfully!",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- READ OPERATIONS ---

/**
 * @desc    Get all bookings (Admin)
 * @route   GET /api/bookings
 * @access  Private (Admin)
 */
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("user", "name email")
      .populate("guide", "name")
      .populate("tour", "title images")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get bookings for the logged-in user
 * @route   GET /api/bookings/my-bookings
 * @access  Private
 */
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate("guide", "name photo")
      .populate("originalGuide", "name")
      .populate("tour", "title images locations")
      .sort({ startDate: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get bookings for the logged-in guide
 * @route   GET /api/bookings/guide-bookings
 * @access  Private (Guide)
 */
export const getGuideBookings = async (req, res) => {
  try {
    const guideProfile = await Guide.findOne({ user: req.user.id });
    if (!guideProfile) {
      return res.status(200).json({ success: true, data: [] });
    }
    const bookings = await Booking.find({ guide: guideProfile._id })
      .populate("user", "name email mobile")
      .populate("tour", "title images locations")
      .sort({ startDate: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get a single booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private (User, Guide, Admin)
 */
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email mobile")
      .populate("guide", "name email mobile photo")
      .populate("originalGuide", "name email mobile photo")
      .populate("tour");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const isUser = booking.user._id.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    const guideProfile = await Guide.findOne({ user: req.user.id });
    const isAssignedGuide = guideProfile && booking.guide._id.toString() === guideProfile._id.toString();

    if (!isUser && !isAdmin && !isAssignedGuide) {
      return res.status(403).json({ success: false, message: "Not authorized to view this booking." });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- UPDATE & ACTION OPERATIONS ---

/**
 * @desc    Update booking status (Admin)
 * @route   PATCH /api/bookings/:id/status
 * @access  Private (Admin)
 */
export const updateBookingStatus = async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["Upcoming", "Completed", "Cancelled", "Awaiting Substitute"];
  
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status provided." });
      }
  
      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
  
      // Note: This is a direct status update. For cancellations with refunds, use the specific cancel route.
      booking.status = status;
      await booking.save();
  
      res.status(200).json({
        success: true,
        message: `Booking status updated to ${status}.`,
        data: booking,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Cancel a booking (handles different logic for different roles)
 * @route   POST /api/bookings/:id/cancel
 * @access  Private (User, Guide, Admin)
 */
export const cancelAndRefundBooking = async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id).populate("user", "name").populate("guide", "name");
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
  
      const isUser = booking.user._id.toString() === req.user.id;
      const isAdmin = req.user.role === "admin";
      const guideProfile = await Guide.findOne({ user: req.user.id });
      const isAssignedGuide = guideProfile && booking.guide._id.toString() === guideProfile._id.toString();
  
      if (!isUser && !isAdmin && !isAssignedGuide) {
        return res.status(403).json({ success: false, message: "You are not authorized for this action." });
      }
  
      if (booking.status !== "Upcoming") {
        return res.status(400).json({ success: false, message: `Cannot cancel a booking with status '${booking.status}'.` });
      }
  
      // SCENARIO 1: User or Admin cancels -> Process Refund
      if (isUser || isAdmin) {
        try {
          const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
          });
          if (booking.advancePaymentId) {
            await instance.payments.refund(booking.advancePaymentId, { amount: Math.round(booking.advanceAmount * 100), speed: "normal" });
          }
          if (booking.remainingPaymentId) {
            await instance.payments.refund(booking.remainingPaymentId, { amount: Math.round(booking.remainingAmount * 100), speed: "normal" });
          }
        } catch (razorpayError) {
          console.error("RAZORPAY REFUND ERROR:", razorpayError);
          return res.status(500).json({ success: false, message: "Refund processing failed. Please contact support." });
        }
  
        const guide = await Guide.findById(booking.guide._id);
        if (guide) {
          const bookingDates = getDatesInRange(booking.startDate, booking.endDate);
          const bookingDatesMillis = bookingDates.map((d) => d.getTime());
          guide.unavailableDates = guide.unavailableDates.filter((d) => !bookingDatesMillis.includes(new Date(d).getTime()));
          await guide.save();
        }
  
        booking.status = "Cancelled";
        booking.paymentStatus = "Refunded";
        booking.cancelledBy = {
          cancellerId: req.user.id,
          cancellerRole: isAdmin ? 'admin' : 'user',
          cancellerName: isAdmin ? 'Admin' : booking.user.name,
        };
        await booking.save();
  
        return res.status(200).json({ success: true, message: "Booking successfully cancelled and refund initiated.", data: booking });
      }
  
      // SCENARIO 2: Guide cancels -> NO REFUND, set status for admin action
      if (isAssignedGuide) {
          const guide = await Guide.findById(booking.guide._id);
          if (guide) {
            const bookingDates = getDatesInRange(booking.startDate, booking.endDate);
            const bookingDatesMillis = bookingDates.map((d) => d.getTime());
            guide.unavailableDates = guide.unavailableDates.filter((d) => !bookingDatesMillis.includes(new Date(d).getTime()));
            await guide.save();
          }
  
          booking.status = "Awaiting Substitute";
          booking.cancelledBy = {
            cancellerId: req.user.id,
            cancellerRole: 'guide',
            cancellerName: guideProfile.name,
          };
          await booking.save();
    
          return res.status(200).json({ success: true, message: "Your assignment has been cancelled. Admin will assign a substitute guide.", data: booking });
      }
  
    } catch (error) {
      console.error("CANCELLATION CONTROLLER ERROR:", error);
      res.status(500).json({ success: false, message: "Failed to process cancellation." });
    }
};

/**
 * @desc    Assign a substitute guide to a booking (Admin)
 * @route   PATCH /api/bookings/:id/assign-substitute
 * @access  Private (Admin)
 */
export const assignSubstituteGuide = async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Not authorized. Only admins can perform this action." });
      }
      const { substituteGuideId } = req.body;
      if (!substituteGuideId) {
        return res.status(400).json({ success: false, message: "Substitute guide ID is required." });
      }
      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
      if (!["Upcoming", "Awaiting Substitute"].includes(booking.status)) {
        return res.status(400).json({ success: false, message: `Can only assign substitute for 'Upcoming' or 'Awaiting Substitute' bookings.` });
      }
      if (booking.guide.toString() === substituteGuideId) {
        return res.status(400).json({ success: false, message: "This guide is already assigned to the booking." });
      }
      const originalGuide = await Guide.findById(booking.guide);
      const substituteGuide = await Guide.findById(substituteGuideId);
      if (!substituteGuide) {
        return res.status(404).json({ success: false, message: "Substitute guide not found." });
      }
      const bookingDates = getDatesInRange(booking.startDate, booking.endDate);
      const isAlreadyBooked = substituteGuide.unavailableDates.some((date) =>
        bookingDates.some((bDate) => bDate.getTime() === new Date(date).getTime())
      );
      if (isAlreadyBooked) {
        return res.status(409).json({ success: false, message: "Substitute guide is not available for these dates." });
      }
      if (originalGuide) {
        const bookingDatesMillis = bookingDates.map((d) => d.getTime());
        originalGuide.unavailableDates = originalGuide.unavailableDates.filter((d) => !bookingDatesMillis.includes(new Date(d).getTime()));
        await originalGuide.save();
      }
      substituteGuide.unavailableDates.push(...bookingDates);
      await substituteGuide.save();
      if (!booking.originalGuide) {
        booking.originalGuide = booking.guide;
      }
      booking.guide = substituteGuideId;
      booking.status = "Upcoming";
      await booking.save();
      const populatedBooking = await Booking.findById(booking._id).populate("user", "name").populate("guide", "name").populate("originalGuide", "name").populate("tour");
      res.status(200).json({ success: true, message: `Successfully assigned ${substituteGuide.name} as the new guide.`, data: populatedBooking });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message || "Failed to assign substitute guide." });
    }
};

// --- DELETE OPERATION ---

/**
 * @desc    Delete a booking (Admin)
 * @route   DELETE /api/bookings/:id
 * @access  Private (Admin)
 */
export const deleteBooking = async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
  
      const guide = await Guide.findById(booking.guide);
      if (guide) {
        const bookingDates = getDatesInRange(booking.startDate, booking.endDate);
        const bookingDatesMillis = bookingDates.map((d) => d.getTime());
        guide.unavailableDates = guide.unavailableDates.filter((d) => !bookingDatesMillis.includes(new Date(d).getTime()));
        await guide.save();
      }
  
      await booking.deleteOne();
  
      res.status(200).json({ success: true, message: "Booking deleted successfully." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
};