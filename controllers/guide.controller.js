import Guide from "../models/Guides.Model.js"; // Corrected model import path
import TourGuideBooking from "../models/TourGuideBooking.Model.js";
import User from "../models/Users.Model.js"; // Corrected model import path
import Location from "../models/Location.Model.js"; 
import Language from "../models/Language.Model.js"; 

/**
 * @desc    Get the profile of the logged-in guide
 * @route   GET /api/guides/profile
 * @access  Private (Guide)
 */
export const getGuideProfile = async (req, res) => {

  console.log(req.user.id)
  try {
    const guide = await Guide.findOne({ user: req.user.id });
    console.log(guide)
    if (!guide) {
      return res
        .status(404)
        .json({ success: false, message: "Guide profile not found." });
    }

    res.status(200).json({
      success: true,
      data: guide,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update the profile of the logged-in guide
 * @route   PUT /api/guides/profile/update
 * @access  Private (Guide)
 */
export const updateGuideProfile = async (req, res) => {
  try {
    const guide = await Guide.findOne({ user: req.user.id });

    if (!guide) {
      return res
        .status(404)
        .json({ success: false, message: "Guide profile not found." });
    }

    // Destructure text fields from request body (hourlyRate removed)
    const {
      name,
      mobile,
      dob,
      state,
      country,
      languages, // ✅ NOW EXPECTS: An array of language name strings
      serviceLocations,
      experience,
      specializations,
      availability,
      description,
    } = req.body;

    // Update basic info
    guide.name = name || guide.name;
    guide.mobile = mobile || guide.mobile;
    guide.dob = dob || guide.dob;
    guide.state = state || guide.state;
    guide.country = country || guide.country;

    // Update professional info (hourlyRate update removed)
    guide.experience = experience || guide.experience;
    guide.description = description || guide.description;

    // Handle array fields
    if (languages) {
      // This code correctly handles an array of strings from the frontend
      guide.languages = Array.isArray(languages) ? languages : JSON.parse(languages);
  }
  if (serviceLocations) {
      guide.serviceLocations = Array.isArray(serviceLocations) ? serviceLocations : JSON.parse(serviceLocations);
  }
  if (specializations) {
      guide.specializations = Array.isArray(specializations) ? specializations : JSON.parse(specializations);
  }
    if (specializations) {
        guide.specializations = Array.isArray(specializations) ? specializations : JSON.parse(specializations);
    }
     if (availability) {
        guide.availability = Array.isArray(availability) ? availability : JSON.parse(availability);
    }

    // Handle file uploads from S3 middleware
    if (req.files) {
      if (req.files.photo) {
        guide.photo = req.files.photo[0].location;
      }
      if (req.files.license) {
        guide.license = req.files.license[0].location;
      }
    }

    // Check to mark profile as complete
    if (guide.name && guide.mobile && guide.dob && guide.country && guide.languages.length > 0 && guide.experience && guide.photo) {
      guide.profileComplete = true;
    }

    const updatedGuide = await guide.save();

    // Also update the core User model for consistency
    await User.findByIdAndUpdate(req.user.id, {
      name: updatedGuide.name,
      mobile: updatedGuide.mobile,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedGuide,
    });
    
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllGuides = async (req, res) => {
  try {
    // 1. Destructure query parameters with defaults for pagination
    const { location, language, page = 1, limit = 20 } = req.query;

    // 2. Build a dynamic filter object
    const filter = {
      isApproved: true,
      profileComplete: true,
    };

    // If a location is provided, add it to the filter using a case-insensitive regex
    if (location) {
      filter.serviceLocations = { $regex: new RegExp(`^${location}$`, 'i') };
    }

    // If a language is provided, add it to the filter using a case-insensitive regex
    if (language) {
      filter.languages = { $regex: new RegExp(`^${language}$`, 'i') };
    }
    
    // 3. Setup pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // 4. Execute the query WITH the filter object
    const guides = await Guide.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // 5. Get the total count of documents that match the filter for pagination
    const total = await Guide.countDocuments(filter);

    // 6. Send the response with pagination data
    res.status(200).json({
      success: true,
      count: guides.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: guides,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminGetAllGuides = async (req, res) => {
  try {
    // 1. Destructure query parameters with defaults for pagination
    const { location, language, page = 1, limit = 20 } = req.query;

    // 2. Build a dynamic filter object
    const filter = {};

    // If a location is provided, add it to the filter using a case-insensitive regex
    if (location) {
      filter.serviceLocations = { $regex: new RegExp(`^${location}$`, 'i') };
    }

    // If a language is provided, add it to the filter using a case-insensitive regex
    if (language) {
      filter.languages = { $regex: new RegExp(`^${language}$`, 'i') };
    }
    
    // 3. Setup pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // 4. Execute the query WITH the filter object
    const guides = await Guide.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // 5. Get the total count of documents that match the filter for pagination
    const total = await Guide.countDocuments(filter);

    // 6. Send the response with pagination data
    res.status(200).json({
      success: true,
      count: guides.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: guides,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// 🔥 NEW FUNCTION: Approve or reject a guide profile (Admin only)
// @desc    Update a guide's approval status
// @route   PATCH /api/guides/:id/approve
// @access  Private/Admin
export const approveGuideProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    // 1. Validate the input from the request body
    if (typeof isApproved !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "The 'isApproved' field must be a boolean value (true or false).",
      });
    }

    // 2. Find the guide by their profile ID
    const guide = await Guide.findById(id);

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide profile not found.",
      });
    }

    // Optional but recommended: Prevent approval if the profile is not complete
    if (isApproved && !guide.profileComplete) {
       return res.status(400).json({
        success: false,
        message: "Cannot approve a guide with an incomplete profile.",
      });
    }

    // 3. Update the approval status and save the document
    guide.isApproved = isApproved;
    await guide.save();

    // 4. Send a success response with the updated guide data
    //    (Sending the data back is crucial for the frontend to update its state)
    res.status(200).json({
      success: true,
      message: `The guide has been ${isApproved ? 'approved' : 'rejected'} successfully.`,
      data: guide,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const updateGuideAvailability = async (req, res) => {
  try {
    const { unavailableDates } = req.body;

    // Validate that unavailableDates is an array
    if (!Array.isArray(unavailableDates)) {
      return res.status(400).json({
        success: false,
        message: "The 'unavailableDates' field must be an array of date strings.",
      });
    }

    const guide = await Guide.findOne({ user: req.user.id });

    if (!guide) {
      return res
        .status(404)
        .json({ success: false, message: "Guide profile not found." });
    }

    // Directly overwrite the unavailableDates array.
    // The frontend will send the complete, updated array.
    guide.unavailableDates = unavailableDates.map(dateStr => new Date(dateStr));

    const updatedGuide = await guide.save();

    res.status(200).json({
      success: true,
      message: "Availability updated successfully.",
      data: updatedGuide, // Send back the updated profile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * @desc    Get a single guide profile by ID
 * @route   GET /api/guides/:id
 * @access  Public
 */
export const getGuideById = async (req, res) => {
  try {
    // 1. Get the ID from the request URL parameters
    const { id } = req.params;

    // 2. Find the guide in the database using their ID
    const guide = await Guide.findById(id);

    // 3. If no guide is found, return a 404 error
    if (!guide) {
      return res
        .status(404)
        .json({ success: false, message: "Guide not found." });
    }

    // 4. If the guide is found, send it back successfully
    res.status(200).json({
      success: true,
      data: guide,
    });
  } catch (error) {
    // Handle potential errors, like an invalid ID format
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getGuidePricingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the guide to get their list of services
    const guide = await Guide.findById(id).select('serviceLocations languages');

    if (!guide) {
      return res.status(404).json({ success: false, message: "Guide not found." });
    }

    // 2. Fetch the full location documents based on the names in the guide's profile
    const locations = await Location.find({
      placeName: { $in: guide.serviceLocations }
    }).select('placeName pricePerPerson'); // Only select the fields we need

    // 3. Fetch the full language documents based on the names
    const languages = await Language.find({
      languageName: { $in: guide.languages }
    }).select('languageName extraCharge'); // Only select the fields we need

    // 4. Return the fetched details
    res.status(200).json({
      success: true,
      data: {
        locations,
        languages,
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * @desc    Get bookings for the logged-in guide
 * @route   GET /api/guides/my-bookings
 * @access  Private/Guide
 */
export const getMyBookings = async (req, res) => {
  // We need to find the Guide Profile ID from the authenticated User ID.
  // The 'protect' middleware should give us req.user._id.
  try{

    const guideProfile = await Guide.findOne({ user: req.user._id });
    
    if (!guideProfile) {
      res.status(404);
      throw new Error('Guide profile not found for the logged-in user.');
    }
    
    // Find all bookings assigned to this guide's profile ID
    const bookings = await TourGuideBooking.find({ guide: guideProfile._id })
    .populate('user', 'name email') // Populate the user's name and email
    .sort({ startDate: -1 }); // Sort by newest first
    
    if (bookings) {
      res.json(bookings);
    } else {
      res.status(404);
      throw new Error('Could not find any bookings for this guide.');
    }
  }catch(error){
    console.error("Error finding booking:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * @desc    Get a single booking by ID for the logged-in guide
 * @route   GET /api/guides/my-bookings/:bookingId
 * @access  Private (Guide Only)
 */
export const getMyBookingById = async (req, res) => {
  // Step 1: Get the booking ID from the URL parameters.
  const { bookingId } = req.params;

  // Step 2: Find the Guide Profile ID from the authenticated user's ID.
  // The 'protect' middleware provides `req.user`.
  try{

    const guideProfile = await Guide.findOne({ user: req.user._id });
    
    if (!guideProfile) {
      res.status(404);
      throw new Error('Guide profile not found for the logged-in user.');
    }
    
    // Step 3: Find the booking in the database with two conditions:
    // - The booking ID must match the one from the URL.
    // - The 'guide' field in the booking must match the logged-in guide's profile ID.
    // This is the critical security check.
    const booking = await TourGuideBooking.findOne({
      _id: bookingId,
      guide: guideProfile._id, // Ensures the booking belongs to this guide
    }).populate('user', 'name email'); // Also fetch the tourist's name and email
    
    // Step 4: Respond
    if (booking) {
    // If a booking is found that matches both conditions, send it.
    res.status(200).json(booking);
  } else {
    // If no booking is found, it either doesn't exist or the guide doesn't have permission.
    // We send a 404 for security reasons (to not reveal its existence).
    res.status(404);
    throw new Error('Booking not found.');
  }
}catch(error){
  console.error(error)
}
};