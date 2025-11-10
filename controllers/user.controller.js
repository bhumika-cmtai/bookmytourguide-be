import User from "../models/Users.Model.js";
import bcrypt from "bcrypt";
import Guide from "../models/Guides.Model.js";

// ===== PUBLIC USER ACTIONS =====

/**
 * Update own profile (users and guides can update their own data)
 * Cannot change: email, role, isActive (admin-only fields)
 */

export const updateOwnProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // If user is a guide, handle guideProfile
    if (req.user.role === "guide") {
      let guideProfile = await Guide.findOne({ user: userId });

      // Create guide profile if it doesn't exist
      if (!guideProfile) {
        guideProfile = await Guide.create({
          user: userId,
          name: req.user.name,
          email: req.user.email,
          mobile: req.user.mobile || "",
        });

        await User.findByIdAndUpdate(userId, {
          guideProfile: guideProfile._id,
        });
      }

      // Allowed fields for guides
      const allowedFields = [
        "name",
        "mobile",
        "dob",
        "state",
        "country",
        "age",
        "languages",
        "experience",
        "specializations",
        "availability",
        "hourlyRate",
        "description",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          // Handle array fields
          if (
            ["languages", "specializations", "availability"].includes(field)
          ) {
            try {
              guideProfile[field] = JSON.parse(req.body[field]);
            } catch {
              guideProfile[field] = Array.isArray(req.body[field])
                ? req.body[field]
                : [req.body[field]];
            }
          } else {
            guideProfile[field] = req.body[field];
          }
        }
      });

      // Files
      if (req.files) {
        if (req.files.photo) guideProfile.photo = req.files.photo[0].path;
        if (req.files.license) guideProfile.license = req.files.license[0].path;
      }

      // Mark profile complete
      const requiredFields = ["name", "mobile", "dob", "photo", "license"];
      guideProfile.profileComplete = requiredFields.every(
        (field) => guideProfile[field]
      );

      await guideProfile.save();

      const updatedUser = await User.findById(userId)
        .select("-password")
        .populate("guideProfile");

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    }

    // Regular user update
    const allowedUpdates = ["name", "mobile", "avatar"];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Password update
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(req.body.password, salt);
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ===== ADMIN USER ACTIONS =====

/**
 * Get all users with pagination & search (Admin only)
 */
export const getAllUsers = async (req, res) => {
  try {
    // 1. Destructure all potential query parameters
    const { page = 1, limit = 10, search = "", role } = req.query;

    // 2. Start with an empty query object
    const query = {};

    // 3. Add search condition if a search term is provided
    //    This searches for the term in both the 'name' and 'email' fields.
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 4. Add role filter condition if a specific role is provided
    //    It ignores the filter if the role is 'all' or not provided.
    if (role && role !== 'all') {
      query.role = role;
    }

    // 5. Execute the find query with the dynamically built conditions
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-password"); // Exclude password from the result

    // 6. Get the total count of documents matching the same query for pagination
    const total = await User.countDocuments(query);

    // 7. Send the successful response with pagination data
    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    // Handle any potential errors
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * Get user by ID (Admin or own profile)
 */
export const getUserById = async (req, res) => {
  try {
    const requestedUserId = req.params.id;
    const currentUserId = req.user._id.toString();
    const currentUserRole = req.user.role;

    // Check if user is requesting their own profile or is admin
    if (currentUserId !== requestedUserId && currentUserRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only access your own profile",
      });
    }

    const user = await User.findById(requestedUserId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get users by role (Admin only)
 */
export const getUsersByRole = async (req, res) => {
  try {
    const role = req.params.role;
    const users = await User.find({ role }).select("-password");
    res.status(200).json({
      success: true,
      total: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create new user (Admin only)
 */
export const createUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with hashed password
    const user = new User({
      ...rest,
      password: hashedPassword,
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update user (Admin only - can update any user)
 */
export const updateUser = async (req, res) => {
  try {
    // Hash the password if it's included in the update
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete user (Admin only)
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Also delete associated guide profile if exists
    if (user.role === "guide" && user.guideProfile) {
      await Guide.findByIdAndDelete(user.guideProfile);
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== GUIDE ADMIN ACTIONS =====

/**
 * Approve/reject guide (Admin only)
 */
export const adminApproveGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (typeof isApproved !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Missing 'isApproved' boolean in body",
      });
    }

    const guide = await Guide.findById(id);

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found",
      });
    }

    // Check if profile is complete before approving
    if (isApproved && !guide.profileComplete) {
      return res.status(400).json({
        success: false,
        message: "Cannot approve guide with incomplete profile",
      });
    }

    guide.isApproved = isApproved;
    await guide.save();

    res.json({
      success: true,
      message: `Guide ${isApproved ? "approved" : "rejected"} successfully`,
      data: guide,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List guides with optional filtering (Admin only)
 */
export const listGuides = async (req, res) => {
  try {
    const { approved, search } = req.query;
    let filter = {};

    // Filter by approval status
    if (approved === "true") filter.isApproved = true;
    if (approved === "false") filter.isApproved = false;

    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const guides = await Guide.find(filter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: guides.length,
      data: guides,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
