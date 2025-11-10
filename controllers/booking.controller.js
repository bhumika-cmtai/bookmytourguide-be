import Booking from "../models/booking.model.js";
import Guide from "../models/Guides.Model.js";
import AdminPackage from "../models/Package.Model.js"; // Ensure you have this package model
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

/**
 * @desc    Create a new booking after successful payment
 * @route   POST /api/bookings/create
 * @access  Private (User)
 */
export const createBooking = async (req, res) => { // Removed 'next' from parameters
  try {
    const {
      tourId,
      guideId,
      startDate,
      endDate,
      numberOfTourists,
      paymentId,
    } = req.body;
    const userId = req.user.id;
    console.log("yahan pahuch gye")

    // 1. Validate inputs
    if (!tourId || !guideId || !startDate || !endDate || !numberOfTourists || !paymentId) {
      // --- CHANGE: Direct response instead of errorHandler ---
      return res.status(400).json({ success: false, message: "All booking fields are required." });
    }

    // 2. Fetch tour and guide from DB to verify details
    const tour = await AdminPackage.findById(tourId);
    const guide = await Guide.findById(guideId);

    if (!tour || !guide) {
      // --- CHANGE: Direct response instead of errorHandler ---
      return res.status(404).json({ success: false, message: "Tour or Guide not found." });
    }

    // 3. Server-side calculation to prevent price tampering
    const totalPrice = tour.price * parseInt(numberOfTourists);
    const advanceAmount = totalPrice * 0.20; // 20% advance

    // 4. Update Guide's availability
    const bookingDates = getDatesInRange(startDate, endDate);
    
    // Check for double booking before saving
    const isAlreadyBooked = guide.unavailableDates.some(date => 
        bookingDates.some(bDate => bDate.getTime() === new Date(date).getTime())
    );

    if(isAlreadyBooked) {
        // --- CHANGE: Direct response instead of errorHandler ---
        return res.status(409).json({ success: false, message: "Sorry, the guide is no longer available for these dates." });
    }
    
    guide.unavailableDates.push(...bookingDates);
    await guide.save();

    // 5. Create the new booking document
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
    // --- CHANGE: Direct response instead of next(error) ---
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
          return res.status(400).json({ success: false, message: "Amount and receipt are required." });
      }
  
      const options = {
        amount: amount * 100, // Amount in the smallest currency unit (paise for INR)
        currency,
        receipt,
      };
  
      const order = await instance.orders.create(options);
  
      if (!order) {
        return res.status(500).json({ success: false, message: "Could not create Razorpay order." });
      }
  
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  
  /**
   * @desc    Verify Razorpay Payment and Create Booking
   * @route   POST /api/payments/verify
   * @access  Private (User)
   */
  export const verifyPaymentAndCreateBooking = async (req, res) => {
    try {
      // 1. Get payment details and booking info from request body
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        // Booking details
        tourId,
        guideId,
        startDate,
        endDate,
        numberOfTourists,
      } = req.body;
      const userId = req.user.id;
  
      // 2. Verify the payment signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");
  
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
      }
  
      // --- If signature is valid, proceed with creating the booking ---
  
      // 3. Fetch related documents
      const tour = await AdminPackage.findById(tourId);
      const guide = await Guide.findById(guideId);
  
      if (!tour || !guide) {
        return res.status(404).json({ success: false, message: "Tour or Guide not found." });
      }
  
      // 4. Server-side calculation
      const totalPrice = tour.price * parseInt(numberOfTourists);
      const advanceAmount = totalPrice * 0.20;
  
      // 5. Update Guide's availability
      const bookingDates = getDatesInRange(startDate, endDate);
      
      // Check for double booking
      const isAlreadyBooked = guide.unavailableDates.some(date => 
          bookingDates.some(bDate => bDate.getTime() === new Date(date).getTime())
      );
      if (isAlreadyBooked) {
        // Note: In a real-world scenario, you might need to refund the payment here.
        return res.status(409).json({ success: false, message: "Sorry, the guide was booked while you were paying." });
      }
      
      guide.unavailableDates.push(...bookingDates);
      await guide.save();
  
      // 6. Create the booking document
      const newBooking = new Booking({
        tour: tourId,
        guide: guideId,
        user: userId,
        startDate,
        endDate,
        numberOfTourists: parseInt(numberOfTourists),
        totalPrice,
        advanceAmount,
        paymentId: razorpay_payment_id, // Use the real payment ID
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
  