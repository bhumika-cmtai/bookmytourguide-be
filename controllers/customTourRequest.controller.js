import CustomTourRequest from "../models/customTourRequest.model.js";
import Location from "../models/Location.Model.js";
import Language from "../models/Language.Model.js";
import { sendEmail } from "../utils/sendEmail.js";

export const getFormData = async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true }).select(
      "placeName"
    );
    const languages = await Language.find({}).select("languageName");
    res.status(200).json({ success: true, data: { locations, languages } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCustomTourRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }
    const newRequest = new CustomTourRequest({ ...req.body, userId });
    let savedRequest = await newRequest.save();

    // Populate the newly created request to get location and language names
    savedRequest = await CustomTourRequest.findById(savedRequest._id)
      .populate("selectedLocations", "placeName")
      .populate("selectedLanguage", "languageName");

    // Send email to admin
    const adminEmail = process.env.EMAIL_USER; // Make sure to set this in your .env file
    if (adminEmail) {
      const subject = `New Custom Tour Request from ${savedRequest.fullName}`;
      const htmlContent = `
        <h2>New Custom Tour Request Details:</h2>
        <p><strong>Full Name:</strong> ${savedRequest.fullName}</p>
        <p><strong>Email:</strong> ${savedRequest.email}</p>
        <p><strong>Phone:</strong> ${savedRequest.phone}</p>
        <p><strong>Selected Locations:</strong> ${savedRequest.selectedLocations
          .map((l) => l.placeName)
          .join(", ")}</p>
        <p><strong>Selected Language:</strong> ${
          savedRequest.selectedLanguage.languageName
        }</p>
        <p><strong>Date Range:</strong> ${new Date(
          savedRequest.dateRange.from
        ).toLocaleDateString()} - ${new Date(
        savedRequest.dateRange.to
      ).toLocaleDateString()}</p>
        <p><strong>Number of Travelers:</strong> ${savedRequest.numTravelers}</p>
        <p><strong>Preferred Monuments:</strong> ${
          savedRequest.preferredMonuments
        }</p>
        <p><strong>Needs Lunch:</strong> ${savedRequest.needsLunch}</p>
        <p><strong>Needs Dinner:</strong> ${savedRequest.needsDinner}</p>
        <p><strong>Needs Stay:</strong> ${savedRequest.needsStay}</p>
      `;
      await sendEmail(adminEmail, subject, htmlContent);
    }

    res.status(201).json({
      success: true,
      message: "Request submitted successfully!",
      data: savedRequest,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAllRequests = async (req, res) => {
  try {
    const requests = await CustomTourRequest.find({})
      .populate("selectedLocations", "placeName")
      .populate("selectedLanguage", "languageName")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await CustomTourRequest.find({ userId: req.user.id })
      .populate("selectedLocations", "placeName")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRequestById = async (req, res) => {
  try {
    const request = await CustomTourRequest.findById(req.params.id)
      .populate("selectedLocations", "placeName")
      .populate("selectedLanguage", "languageName");
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const updateRequestStatus = async (req, res) => {
  try {
    const { status, quoteAmount, adminComment } = req.body;
    const allowedStatuses = ["Pending", "Quoted", "Booked", "Rejected"];

    if (!status || !allowedStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const updateData = { status };
    if (status === "Quoted") {
      updateData.quoteAmount = quoteAmount;
      updateData.adminComment = adminComment;
    }

    const updatedRequest = await CustomTourRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      data: updatedRequest,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const deleteRequest = async (req, res) => {
  try {
    const deletedRequest = await CustomTourRequest.findByIdAndDelete(
      req.params.id
    );
    if (!deletedRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Request deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
