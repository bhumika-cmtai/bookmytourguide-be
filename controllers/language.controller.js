// controllers/language.controller.js
import Language from "../models/Language.Model.js";

// @desc    Create a new language option
// @route   POST /api/admin/languages
// @access  Private/Admin
export const createLanguage = async (req, res) => {
  try {
    // ✅ MODIFIED: Destructure fields to handle the new pricing structure.
    const { languageName, pricing } = req.body;

    const languageData = {
      languageName,
      pricing: {
        standardGroup: {
          price: pricing.standardGroup.price,
        },
        largeGroup: {
          price: pricing.largeGroup.price,
        }
      }
    };

    const language = await Language.create(languageData);
    res.status(201).json({
      success: true,
      message: "Language created successfully",
      data: language,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// @desc    Get all language options
// @route   GET /api/admin/languages
// @access  Private/Admin
export const getAllLanguages = async (req, res) => {
  try {
    const languages = await Language.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: languages.length,
      data: languages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single language by ID
// @route   GET /api/admin/languages/:id
// @access  Private/Admin
export const getLanguageById = async (req, res) => {
  try {
    const language = await Language.findById(req.params.id);
    if (!language) {
      return res.status(404).json({ success: false, message: "Language not found" });
    }
    res.status(200).json({ success: true, data: language });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a language option
// @route   PUT /api/admin/languages/:id
// @access  Private/Admin
export const updateLanguage = async (req, res) => {
  try {
    // ✅ MODIFIED: Construct updateData to handle the new pricing structure.
    const { languageName, pricing } = req.body;
    const updateData = { languageName };

    if (pricing) {
      updateData.pricing = {
        standardGroup: {
          price: pricing.standardGroup.price,
        },
        largeGroup: {
          price: pricing.largeGroup.price,
        }
      };
    }

    const language = await Language.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!language) {
      return res.status(404).json({ success: false, message: "Language not found" });
    }

    res.status(200).json({
      success: true,
      message: "Language updated successfully",
      data: language,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a language option
// @route   DELETE /api/admin/languages/:id
// @access  Private/Admin
export const deleteLanguage = async (req, res) => {
  try {
    const language = await Language.findByIdAndDelete(req.params.id);
    if (!language) {
      return res.status(404).json({ success: false, message: "Language not found" });
    }
    res.status(200).json({ success: true, message: "Language deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};