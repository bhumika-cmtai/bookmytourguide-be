import User from "../models/Users.Model.js";
import Guide from "../models/Guides.Model.js";
import Booking from "../models/booking.model.js";
import TourGuideBooking from "../models/TourGuideBooking.Model.js"; // Corrected filename
import CustomTourRequest from "../models/customTourRequest.model.js";

// Helper function to handle errors
const handleError = (res, error) => {
  console.error("Dashboard Stats Error:", error);
  res.status(500).json({ success: false, message: error.message });
};

// --- ADMIN STATS ---
const getAdminStats = async (res) => {
  try {
    const [
      totalUsers,
      totalGuides,
      approvedGuides,
      certifiedGuides, // Assuming certified means profile is complete
      totalBookings,
      totalTourGuideBookings,
      totalCustomRequests,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "guide" }),
      Guide.countDocuments({ isApproved: true }),
      Guide.countDocuments({ profileComplete: true }),
      Booking.countDocuments({}),
      TourGuideBooking.countDocuments({}),
      CustomTourRequest.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalGuides,
        approvedGuides,
        certifiedGuides,
        totalBookings,
        totalTourGuideBookings,
        totalCustomRequests,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

// --- GUIDE STATS ---
const getGuideStats = async (req, res) => {
  try {
    const guideProfile = await Guide.findOne({ user: req.user._id });

    if (!guideProfile) {
      return res.status(404).json({ success: false, message: "Guide profile not found." });
    }

    const guideId = guideProfile._id;

    const [
        totalPackageBookings,
        completedPackageBookings,
        upcomingPackageBookings,
        totalTourGuideBookings,
        completedTourGuideBookings,
        upcomingTourGuideBookings
    ] = await Promise.all([
        Booking.countDocuments({ guide: guideId }),
        Booking.countDocuments({ guide: guideId, status: "Completed" }),
        Booking.countDocuments({ guide: guideId, status: "Upcoming" }),
        TourGuideBooking.countDocuments({ guide: guideId }),
        TourGuideBooking.countDocuments({ guide: guideId, status: "Completed" }),
        TourGuideBooking.countDocuments({ guide: guideId, status: "Upcoming" }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalPackageBookings,
            completedPackageBookings,
            upcomingPackageBookings,
            totalTourGuideBookings,
            completedTourGuideBookings,
            upcomingTourGuideBookings,
            profileStatus: {
              isApproved: guideProfile.isApproved,
              profileComplete: guideProfile.profileComplete,
              isCertified: guideProfile.isCertified, // Now included
              subscriptionPlan: guideProfile.subscriptionPlan, // Now included
              subscriptionExpiresAt: guideProfile.subscriptionExpiresAt, // Now included
          },
        },
    });
  } catch (error) {
    handleError(res, error);
  }
};

// --- USER STATS ---
const getUserStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const [
            totalBookings,
            completedBookings,
            upcomingBookings,
            remainingPaymentBookings
        ] = await Promise.all([
            Booking.countDocuments({ user: userId }),
            Booking.countDocuments({ user: userId, status: "Completed" }),
            Booking.countDocuments({ user: userId, status: "Upcoming" }),
            Booking.countDocuments({
                user: userId,
                paymentStatus: "Advance Paid",
                status: "Upcoming", // Only show remaining for upcoming tours
            }),
        ]);

        const [
            totalCustomRequests,
            quotedCustomRequests,
            bookedCustomRequests,
        ] = await Promise.all([
            CustomTourRequest.countDocuments({ userId }),
            CustomTourRequest.countDocuments({ userId, status: "Quoted" }),
            CustomTourRequest.countDocuments({ userId, status: "Booked" }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                packageBookings: {
                    total: totalBookings,
                    completed: completedBookings,
                    upcoming: upcomingBookings,
                    remainingPayment: remainingPaymentBookings,
                },
                customTourRequests: {
                    total: totalCustomRequests,
                    quoted: quotedCustomRequests,
                    booked: bookedCustomRequests,
                },
            },
        });
    } catch (error) {
        handleError(res, error);
    }
};


/**
 * @desc    Get dashboard statistics based on user role
 * @route   GET /api/dashboard/stats
 * @access  Private (Admin, Guide, User)
 */
export const getDashboardStats = async (req, res) => {
  const { role } = req.user;

  switch (role) {
    case "admin":
      return getAdminStats(res);
    case "guide":
      return getGuideStats(req, res);
    case "user":
      return getUserStats(req, res);
    default:
      return res.status(403).json({ success: false, message: "Access denied." });
  }
};