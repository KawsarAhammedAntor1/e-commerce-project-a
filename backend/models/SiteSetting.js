const mongoose = require('mongoose');

const siteSettingSchema = new mongoose.Schema({
    siteName: {
        type: String,
        default: "Girl's Fashion"
    },
    logoUrl: {
        type: String,
        default: ""
    },
    logoPublicId: {
        type: String,
        default: ""
    },
    bannerUrl: {
        type: String,
        default: ""
    },
    bannerPublicId: {
        type: String,
        default: ""
    },
    adminEmail: {
        type: String,
        default: "" // Optional: for contact forms
    },
    facebookUrl: {
        type: String,
        default: ""
    },
    supportEmail: {
        type: String,
        default: ""
    }
}, { timestamps: true });

// We only need one document for settings, but standard collection is fine.
// The controller will ensure we always update the FIRST document or create one if missing.

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
