import Guide from "../models/Guides.model.js"; // Corrected model import path
import User from "../models/Users.model.js"; // Corrected model import path

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
      languages,
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
        guide.languages = Array.isArray(languages) ? languages : JSON.parse(languages);
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
