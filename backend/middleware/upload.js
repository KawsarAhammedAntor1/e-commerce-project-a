const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary'); // Import the configured cloudinary instance

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'WebDevJourney3', // Folder name in Cloudinary
        // transformation and quality optimization added below
        transformation: [{ fetch_format: "auto", quality: "auto" }],
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage: storage });

module.exports = upload;