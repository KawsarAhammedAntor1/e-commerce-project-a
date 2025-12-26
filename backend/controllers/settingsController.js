const SiteSetting = require('../models/SiteSetting');
const cloudinary = require('../config/cloudinary');

// @desc    Get Site Settings (Public)
// @route   GET /api/settings
// @access  Public
const getSettings = async (req, res) => {
    try {
        // Find the first settings document
        let settings = await SiteSetting.findOne();

        // If no settings exist yet, return defaults (or create one)
        if (!settings) {
            settings = await SiteSetting.create({});
        }

        res.json(settings);
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ message: "Server Error fetching settings" });
    }
};

// @desc    Update Site Settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        console.log("Update Settings Request Body:", req.body);
        console.log("Update Settings Request Files:", req.files);

        const { siteName, facebookUrl, supportEmail } = req.body;
        // Files are in req.files['logo'] and req.files['banner']

        let settings = await SiteSetting.findOne();

        if (!settings) {
            settings = new SiteSetting();
        }

        // Update Text Fields
        if (siteName) settings.siteName = siteName;
        // Update Contact Fields (Allow empty strings to clear values)
        if (facebookUrl !== undefined) settings.facebookUrl = facebookUrl;
        if (supportEmail !== undefined) settings.supportEmail = supportEmail;

        // Handle Logo Upload
        if (req.files && req.files['logo']) {
            const file = req.files['logo'][0];

            // Delete old logo if exists
            if (settings.logoPublicId) {
                try {
                    await cloudinary.uploader.destroy(settings.logoPublicId);
                } catch (err) {
                    console.error("Failed to delete old logo:", err);
                }
            }

            settings.logoUrl = file.path;
            settings.logoPublicId = file.filename; // Cloudinary returns public_id as filename
        }

        // Handle Banner Upload
        if (req.files && req.files['banner']) {
            const file = req.files['banner'][0];

            // Delete old banner if exists
            if (settings.bannerPublicId) {
                try {
                    await cloudinary.uploader.destroy(settings.bannerPublicId);
                } catch (err) {
                    console.error("Failed to delete old banner:", err);
                }
            }

            settings.bannerUrl = file.path;
            settings.bannerPublicId = file.filename;
        }

        const updatedSettings = await settings.save();
        res.json(updatedSettings);

    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ message: "Server Error updating settings" });
    }
};

// @desc    Delete Settings Image (Logo or Banner)
// @route   DELETE /api/settings/image/:type
// @access  Private/Admin
const deleteSettingsImage = async (req, res) => {
    try {
        const { type } = req.params; // 'logo' or 'banner'

        let settings = await SiteSetting.findOne();
        if (!settings) {
            return res.status(404).json({ message: "Settings not found" });
        }

        if (type === 'logo') {
            if (settings.logoPublicId) {
                await cloudinary.uploader.destroy(settings.logoPublicId);
            }
            settings.logoUrl = "";
            settings.logoPublicId = "";
        } else if (type === 'banner') {
            if (settings.bannerPublicId) {
                await cloudinary.uploader.destroy(settings.bannerPublicId);
            }
            settings.bannerUrl = "";
            settings.bannerPublicId = "";
        } else {
            return res.status(400).json({ message: "Invalid image type" });
        }

        await settings.save();
        res.json({ message: `${type} deleted successfully`, settings });

    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ message: "Server Error deleting image" });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    deleteSettingsImage
};
