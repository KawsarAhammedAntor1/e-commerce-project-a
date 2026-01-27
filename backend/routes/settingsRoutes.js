const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, deleteSettingsImage } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Public Route: Get Settings
router.get('/', getSettings);

// Admin Route: Update Settings (Supports File Upload)
router.put('/', protect, admin, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), updateSettings);

// Admin Route: Delete Image (Logo or Banner)
router.delete('/image/:type', protect, admin, deleteSettingsImage);

module.exports = router;
