const express = require('express');
const router = express.Router();
const { signup, login, getUser, forgotPassword, resetPassword, updateProfilePic } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const passport = require('passport');
const generateToken = require('../utils/generateToken');

// ===========================================
// Google Auth Routes (Must be before /:id)
// ===========================================

// @route   GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @route   GET /api/auth/google/callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html', session: false }),
    (req, res) => {
        // Successful authentication
        const token = generateToken(req.user._id, req.user.role);
        // Redirect to frontend with token
        const frontendUrl = process.env.BASE_URL || 'https://e-commerce-project-3-d3a1.onrender.com';
        res.redirect(`${frontendUrl}/login.html?token=${token}`);
    }
);

// ===========================================
// Standard Auth Routes
// ===========================================

// @route   POST /api/auth/profile-pic
router.post('/profile-pic', protect, upload.single('profilePic'), updateProfilePic);

// @route   POST /api/auth/signup
router.route('/signup').post(signup);

// @route   POST /api/auth/login
router.route('/login').post(login);

// @route   POST /api/auth/forgot-password
router.route('/forgot-password').post(forgotPassword);

// @route   POST /api/auth/reset-password
router.route('/reset-password').post(resetPassword);

// @route   GET /api/auth/:id
router.route('/:id').get(getUser);

module.exports = router;
