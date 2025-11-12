// controllers/tourguidebook.controller.js
import Razorpay from "razorpay";
import crypto from "crypto";
import TourGuideBooking from "../models/TourGuideBooking.model.js";
import Guide from "../models/Guides.Model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createBookingOrder = async (req, res) => {
    console.log("reached here")
    try {
      // Step 1: Frontend se sirf 'totalPrice' lein.
      const { totalPrice } = req.body;
      console.log("---totalPrice---",totalPrice)
      
      if (!totalPrice || totalPrice <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "A valid total price is required." 
        });
      }
  
      // Step 2: Backend par advance amount (20%) calculate karein.
      const advanceAmount = Math.round(totalPrice * 0.20);
      
      // Step 3: Razorpay ke liye options object banayein. 'receipt' yahin generate hoga.
      const options = {
        amount: advanceAmount * 100, // Amount hamesha paisa mein
        currency: "INR",
        receipt: `receipt_booking_adv_${crypto.randomBytes(6).toString('hex')}`, // Unique receipt
      };
      console.log("---options---",options)
  
      // Step 4: Razorpay order create karein.
      const order = await razorpay.orders.create(options);
      console.log("---order---",order)
      
      if (!order) {
      console.log("---! order---",order)
        return res.status(500).json({ 
          success: false, 
          message: "Could not create Razorpay order." 
        });
      }
      
      res.status(201).json({ success: true, data: order });
  
    } catch (error) {
        console.log(error)
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Server error while creating order." 
      });
    }
  };

  export const verifyAndCreateBooking = async (req, res) => {
    try {
      const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        guideId, location, language, startDate, endDate,
        numberOfTravelers, totalPrice, contactInfo,
      } = req.body;
  
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");
  
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature." });
      }
  
      const advanceAmount = Math.round(totalPrice * 0.20);
      const remainingAmount = totalPrice - advanceAmount;
  
      // Step 1: Booking create ho rahi hai
      const newBooking = await TourGuideBooking.create({
        guide: guideId, user: req.user.id, location, language, startDate, endDate,
        numberOfTravelers, totalPrice, advanceAmount, remainingAmount,
        razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature, contactInfo, paymentStatus: "Advance Paid",
      });
  
      // ✅✅✅ AAPKI REQUIREMENT YAHAN POORI HO RAHI HAI ✅✅✅
      // Step 2: Guide ko dhoondh kar uski dates ko unavailable mark kiya ja raha hai
      const guide = await Guide.findById(guideId);
      if (guide) {
        const bookingDates = [];
        let currentDate = new Date(startDate);
        const lastDate = new Date(endDate);

        // Start date se end date tak loop chalega
        while (currentDate <= lastDate) {
          bookingDates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Saari booking dates ko guide ke 'unavailableDates' array mein add kiya ja raha hai
        guide.unavailableDates.push(...bookingDates);
        await guide.save(); // Guide document ko save kiya ja raha hai
        console.log(`Guide ${guide.name}'s availability updated for the new booking.`);
      }
  
      res.status(201).json({
        success: true,
        message: "Booking confirmed and guide's calendar updated!",
        data: newBooking,
      });
  
    } catch (error) {
      console.error("ERROR VERIFYING BOOKING:", error);
      res.status(500).json({ success: false, message: error.message });
    }
};
  


/**
 * 🔥 NAYA FUNCTION: Booking cancel karna aur refund process karna
 * @desc    Cancel a booking and process refund via Razorpay
 * @route   POST /api/bookings/:id/cancel
 * @access  Private (User who booked, or Admin)
 */
export const cancelBookingAndProcessRefund = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await TourGuideBooking.findById(req.params.id);

    // 1. Booking hai ya nahi, check karo
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // 2. Authorization check: Sirf admin ya booking karne wala user hi cancel kar sakta hai
    const isOwner = booking.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "You are not authorized to cancel this booking." });
    }

    // 3. Status check: Agar pehle se completed ya cancelled hai to error do
    if (booking.status === "Completed" || booking.status === "Cancelled") {
      return res.status(400).json({ success: false, message: `This booking is already ${booking.status.toLowerCase()}.` });
    }
    
    // 4. Razorpay se refund process karo
    const refundAmountInPaisa = booking.advanceAmount * 100;
    
    // Safety check
    if (!booking.razorpayPaymentId || refundAmountInPaisa <= 0) {
        return res.status(400).json({ success: false, message: "Cannot process refund due to missing payment details." });
    }
    
    const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
        amount: refundAmountInPaisa,
        speed: "normal", // 'normal' ya 'instant'
        notes: {
            bookingId: booking._id.toString(),
            reason: reason || "Cancellation initiated by user/admin."
        }
    });

    if (!refund) {
        return res.status(500).json({ success: false, message: "Refund initiation failed with Razorpay." });
    }

    // 5. Database mein booking update karo
    booking.status = "Cancelled";
    booking.paymentStatus = "Refunded";
    booking.cancellationReason = reason || "No reason provided.";
    booking.cancelledBy = isAdmin ? "Admin" : "User";
    booking.razorpayRefundId = refund.id;

    await booking.save();
    
    // 6. Guide ki availability ko wapas free karo
    const guide = await Guide.findById(booking.guide);
    if (guide) {
      const bookingStart = new Date(booking.startDate).getTime();
      const bookingEnd = new Date(booking.endDate).getTime();
      
      guide.unavailableDates = guide.unavailableDates.filter(date => {
          const unavailableTime = new Date(date).getTime();
          return unavailableTime < bookingStart || unavailableTime > bookingEnd;
      });
      await guide.save();
    }

    res.status(200).json({ success: true, message: "Booking cancelled and refund initiated successfully.", data: booking });

  } catch (error) {
    // Razorpay se aane wale errors ko handle karna
    console.error("Cancellation Error:", error);
    const errorMessage = error.error?.description || error.message || "An unexpected error occurred during cancellation.";
    res.status(500).json({ success: false, message: errorMessage });
  }
};


// Baaki ke CRUD functions waise hi rahenge
// ... (getAllBookings, getBookingById, etc.) ...
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await TourGuideBooking.find({}).populate("guide", "name email photo").populate("user", "name email").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await TourGuideBooking.findById(req.params.id).populate("guide").populate("user");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
    if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user.id) {
       return res.status(403).json({ success: false, message: "Not authorized to view this booking." });
    }
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Upcoming", "Completed", "Cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }
    // Note: Is function se refund nahi hoga. Refund ke liye /cancel route use karein.
    if(status === 'Cancelled') {
        return res.status(400).json({ success: false, message: "To cancel and refund, please use the POST /:id/cancel endpoint."})
    }
    const booking = await TourGuideBooking.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
    res.status(200).json({ success: true, message: `Booking status updated to ${status}.`, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const booking = await TourGuideBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
    res.status(200).json({ success: true, message: "Booking deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFinalPaymentOrder = async (req, res) => {
    try {
      const booking = await TourGuideBooking.findById(req.params.id);
  
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
      if (booking.paymentStatus !== "Advance Paid") {
        return res.status(400).json({ success: false, message: `Payment cannot be processed. Current status is '${booking.paymentStatus}'.` });
      }
  
      const options = {
        amount: booking.remainingAmount * 100,
        currency: "INR",
        receipt: `receipt_booking_final_${booking._id}`,
      };
  
      const order = await razorpay.orders.create(options);
  
      // Order ID ko booking mein save karlein taaki verify kar sakein
      booking.finalPaymentRazorpayOrderId = order.id;
      await booking.save();
  
      res.status(201).json({ success: true, data: order });
  
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  
  // 🔥 NAYA FUNCTION: Final payment ko verify karna aur booking update karna
  export const verifyFinalPayment = async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const booking = await TourGuideBooking.findById(req.params.id);
  
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
      // Security check: Verify karein ki order ID match ho rahi hai
      if (booking.finalPaymentRazorpayOrderId !== razorpay_order_id) {
          return res.status(400).json({ success: false, message: "Order ID does not match." });
      }
      
      // Razorpay signature verify karein
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature." });
      }
      
      // Sab theek hai, to booking update karein
      booking.paymentStatus = "Fully Paid";
      booking.remainingAmount = 0;
      booking.finalPaymentRazorpayPaymentId = razorpay_payment_id;
      await booking.save();
      
      res.status(200).json({ success: true, message: "Full payment successful! Your booking is fully paid.", data: booking });
  
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };


  /**
 * @desc    Get all bookings for a specific user with pagination
 * @route   GET /api/tourguide/user-bookings
 * @access  Private (for the logged-in user)
 */
export const getUserBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const userId = req.user.id; // Get user ID from the 'protect' middleware

    const bookings = await TourGuideBooking.find({ user: userId })
      .populate("guide", "name email photo")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const totalBookings = await TourGuideBooking.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalBookings / limit);

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        page,
        totalPages,
        totalBookings,
      },
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const reassignGuide = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { newGuideId } = req.body;

    if (!newGuideId) {
      return res.status(400).json({ success: false, message: "New guide ID is required." });
    }

    // 1. Find the booking
    const booking = await TourGuideBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const oldGuideId = booking.guide;

    // Prevent reassigning to the same guide
    if (oldGuideId.toString() === newGuideId) {
        return res.status(400).json({ success: false, message: "Cannot reassign to the same guide." });
    }

    // 2. Find the old and new guides
    const [oldGuide, newGuide] = await Promise.all([
      Guide.findById(oldGuideId),
      Guide.findById(newGuideId)
    ]);

    if (!newGuide) {
      return res.status(404).json({ success: false, message: "New guide not found." });
    }

    // 3. Prepare booking dates for availability update
    const bookingDates = [];
    let currentDate = new Date(booking.startDate);
    const lastDate = new Date(booking.endDate);
    while (currentDate <= lastDate) {
      bookingDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 4. Free up the old guide's calendar
    if (oldGuide) {
      const bookingStartMs = new Date(booking.startDate).getTime();
      const bookingEndMs = new Date(booking.endDate).getTime();
      oldGuide.unavailableDates = oldGuide.unavailableDates.filter(date => {
        const unavailableTimeMs = new Date(date).getTime();
        return unavailableTimeMs < bookingStartMs || unavailableTimeMs > bookingEndMs;
      });
      await oldGuide.save();
    }

    // 5. Block the new guide's calendar
    newGuide.unavailableDates.push(...bookingDates);
    await newGuide.save();

    // 6. Update the booking document
    booking.originalGuide = oldGuideId; // Save the original guide's ID
    booking.guide = newGuideId;       // Assign the new guide
    await booking.save();
    
    // 7. Populate the updated booking to send back to the frontend
    const updatedBooking = await TourGuideBooking.findById(bookingId)
      .populate('guide', 'name email')
      .populate('user', 'name email')
      .populate('originalGuide', 'name email');

    res.status(200).json({
      success: true,
      message: "Guide reassigned successfully!",
      data: updatedBooking,
    });

  } catch (error) {
    console.error("Error reassigning guide:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
