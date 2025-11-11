import Booking from "../models/booking.model.js";
import Guide from "../models/Guides.Model.js";
import AdminPackage from "../models/Package.Model.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= new Date(endDate)) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const createBooking = async (req, res) => {
  try {
    const { tourId, guideId, startDate, endDate, numberOfTourists, paymentId } =
      req.body;
    const userId = req.user.id;

    if (
      !tourId ||
      !guideId ||
      !startDate ||
      !endDate ||
      !numberOfTourists ||
      !paymentId
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All booking fields are required." });
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

    const bookingDates = getDatesInRange(startDate, endDate);

    const isAlreadyBooked = guide.unavailableDates.some((date) =>
      bookingDates.some((bDate) => bDate.getTime() === new Date(date).getTime())
    );

    if (isAlreadyBooked) {
      return res.status(409).json({
        success: false,
        message: "Sorry, the guide is no longer available for these dates.",
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
      paymentId,
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

    const options = {
      amount: amount * 100,
      currency,
      receipt,
    };

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
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
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
      paymentId: razorpay_payment_id,
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

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("user", "name email")
      .populate("guide", "name")
      .populate("tour", "title images")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate("guide", "name photo")
      .populate("tour", "title images locations")
      .sort({ startDate: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGuideBookings = async (req, res) => {
  try {
    const guideProfile = await Guide.findOne({ user: req.user.id });

    if (!guideProfile) {
      return res.status(200).json({ success: true, data: [] });
    }

    const bookings = await Booking.find({ guide: guideProfile._id })
      .populate("user", "name email mobile")
      .populate("tour", "title images locations")
      .populate("guide", "name photo")
      .sort({ startDate: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email mobile")
      .populate("guide", "name email mobile photo")
      .populate("originalGuide", "name email mobile photo")
      .populate("tour");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      "Upcoming",
      "Completed",
      "Cancelled",
      "Awaiting Substitute",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status provided." });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

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

export const cancelAndRefundBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    const isUser = booking.user.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isUser && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    if (booking.status !== "Upcoming") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking with status '${booking.status}'.`,
      });
    }

    // Razorpay refund process
    try {
      const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      // Pehle payment details check karo
      console.log("Payment ID:", booking.paymentId);
      console.log("Refund Amount:", booking.advanceAmount * 100);

      // Payment fetch karke check karo ki captured hai ya nahi
      const payment = await instance.payments.fetch(booking.paymentId);
      console.log("Payment Status:", payment.status);

      if (payment.status !== 'captured') {
        return res.status(400).json({
          success: false,
          message: "Payment was not captured. Cannot process refund.",
        });
      }

      // Refund create karo - SAHI SYNTAX
      const refund = await instance.payments.refund(booking.paymentId, {
        amount: Math.round(booking.advanceAmount * 100), // Ensure integer
        speed: "normal",
        notes: {
          reason: "Booking cancelled by user/admin.",
          bookingId: booking._id.toString(),
        },
      });

      console.log("Refund Created:", refund);

    } catch (razorpayError) {
      console.error("RAZORPAY REFUND ERROR:", razorpayError);
      console.error("Error Details:", {
        message: razorpayError.message,
        statusCode: razorpayError.statusCode,
        error: razorpayError.error,
      });

      // Better error message
      let errorMessage = "Refund processing failed. ";
      if (razorpayError.error?.description) {
        errorMessage += razorpayError.error.description;
      } else if (razorpayError.message) {
        errorMessage += razorpayError.message;
      } else {
        errorMessage += "Please contact support.";
      }

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }

    // Guide dates remove karo
    const guide = await Guide.findById(booking.guide);
    if (guide) {
      const bookingDates = getDatesInRange(booking.startDate, booking.endDate);
      const bookingDatesMillis = bookingDates.map((d) => d.getTime());
      guide.unavailableDates = guide.unavailableDates.filter(
        (d) => !bookingDatesMillis.includes(new Date(d).getTime())
      );
      await guide.save();
    }

    // Booking update karo
    booking.status = "Cancelled";
    booking.paymentStatus = "Refunded";
    const updatedBooking = await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking successfully cancelled and refund initiated.",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("CANCELLATION CONTROLLER ERROR:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to cancel booking." });
  }
};

export const assignSubstituteGuide = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized. Only admins can perform this action.",
      });
    }

    const { substituteGuideId } = req.body;
    if (!substituteGuideId) {
      return res
        .status(400)
        .json({ success: false, message: "Substitute guide ID is required." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    if (!["Upcoming", "Awaiting Substitute"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Can only assign substitute for 'Upcoming' or 'Awaiting Substitute' bookings.`,
      });
    }
    if (booking.guide.toString() === substituteGuideId) {
      return res.status(400).json({
        success: false,
        message: "This guide is already assigned to the booking.",
      });
    }

    const originalGuide = await Guide.findById(booking.guide);
    const substituteGuide = await Guide.findById(substituteGuideId);

    if (!substituteGuide) {
      return res
        .status(404)
        .json({ success: false, message: "Substitute guide not found." });
    }

    const bookingDates = getDatesInRange(booking.startDate, booking.endDate);
    const isAlreadyBooked = substituteGuide.unavailableDates.some((date) =>
      bookingDates.some((bDate) => bDate.getTime() === new Date(date).getTime())
    );

    if (isAlreadyBooked) {
      return res.status(409).json({
        success: false,
        message: "Substitute guide is not available for these dates.",
      });
    }

    if (originalGuide) {
      const bookingDatesMillis = bookingDates.map((d) => d.getTime());
      originalGuide.unavailableDates = originalGuide.unavailableDates.filter(
        (d) => !bookingDatesMillis.includes(new Date(d).getTime())
      );
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

    const populatedBooking = await Booking.findById(booking._id)
      .populate("user", "name email mobile")
      .populate("guide", "name email mobile photo")
      .populate("originalGuide", "name email mobile photo")
      .populate("tour");

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${substituteGuide.name} as the new guide.`,
      data: populatedBooking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign substitute guide.",
    });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    const guide = await Guide.findById(booking.guide);
    const bookingDates = getDatesInRange(booking.startDate, booking.endDate);
    const bookingDatesMillis = bookingDates.map((d) => d.getTime());

    if (guide) {
      guide.unavailableDates = guide.unavailableDates.filter(
        (d) => !bookingDatesMillis.includes(new Date(d).getTime())
      );
      await guide.save();
    }

    await booking.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Booking deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
