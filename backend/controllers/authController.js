const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const jwt = require('jsonwebtoken'); // Import jwt
const nodemailer = require('nodemailer'); // Import nodemailer
const crypto = require('crypto'); // Import crypto for generating OTP

// Configure Nodemailer Transporter
// NOTE: You must provide valid credentials in .env or replace these placeholders
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred service
    auth: {
        user: process.env.SMTP_EMAIL || 'your-email@gmail.com',
        pass: process.env.SMTP_PASSWORD || 'your-email-app-password'
    }
});

// Verify Transporter
transporter.verify((error, success) => {
    if (error) {
        console.log('Error verifying email transporter:', error);
    } else {
        console.log('Email transporter is ready. Sending from:', process.env.SMTP_EMAIL);
    }
});

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
    const { name, email, password } = req.body;
    console.log('Signup attempt:', { name, email, password: '[HIDDEN]' }); // Log incoming data

    try {
        const userExists = await User.findOne({ email });
        console.log('User exists check:', userExists ? 'User found' : 'User not found');

        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
        });
        console.log('User creation result:', user);

        if (user) {
            // Ensure the user object has a role, default to 'user' if not explicitly set
            const newUserRole = user.role || 'user';
            res.status(201).json({
                success: true,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: newUserRole,
                },
                token: generateToken(user._id, newUserRole),
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Error during signup:', error); // Log actual error object
        // Check for duplicate key error (MongoDB error code 11000)
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: error.toString() });
    }
};

// @desc    Authenticate user & get user data
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    const { email, password } = req.body;

    console.log('Login attempt:', { email, password: '[HIDDEN]' }); // Log incoming data

    try {
        const user = await User.findOne({ email });
        console.log('User find result:', user ? 'User found' : 'User not found');

        if (user && (await user.matchPassword(password))) {
            console.log('Password matched for user:', user.email);

            // Determine Role (Logic to support Admin testing/setup)
            let userRole = user.role;

            // Optional: Maintain logic for specific emails if needed, or rely on DB role
            if (user.email === 'nurulislam@gmail.com' || user.email === 'kawsarahammed200e@gmail.com') {
                if (userRole !== 'admin') {
                    // Logic kept unchanged as requested
                }
            }

            // Hardcode check for previous Master Key email to ensure it has admin privileges if it exists in DB
            if (email === 'kawsarahammed200e@gmail.com') {
                userRole = 'admin';
            }

            res.json({
                success: true,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: userRole,
                    profilePic: user.profilePic, // Persist Profile Picture
                },
                token: generateToken(user._id, userRole),
            });
        } else {
            // ============================================================
            // ✅ CHANGE MADE HERE: Use .env variables for Master Key
            // ============================================================
            if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
                console.log("⚠️ MASTER KEY: Auto-Creating Admin Account in Database to ensure persistence.");
                try {
                    const newAdmin = await User.create({
                        name: 'Admin',
                        email: email,
                        password: password, // Pre-save hook will hash this
                        role: 'admin'
                    });

                    const token = generateToken(newAdmin._id, 'admin');
                    return res.status(201).json({
                        success: true,
                        user: {
                            _id: newAdmin._id,
                            name: newAdmin.name, // "Admin"
                            email: newAdmin.email,
                            role: 'admin',
                            profilePic: ''
                        },
                        token: token
                    });
                } catch (createErr) {
                    console.error("Auto-Register Admin Failed:", createErr);
                    return res.status(500).json({ success: false, message: 'Failed to auto-create admin account' });
                }
            }
            // ============================================================

            console.log('Login failed: Invalid email or password');
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error during login:', error); // Log actual error object
        res.status(500).json({ success: false, message: 'Server Error', error: error.toString() });
    }
};

// @desc    Get user by ID
// @route   GET /api/auth/:id
// @access  Private (for now, will make private with middleware later if needed)
const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); // Exclude password

        if (user) {
            res.json({
                success: true,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    profilePic: user.profilePic,
                },
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.toString() });
    }
}


// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found with this email' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Set OTP and expiration (5 minutes)
        user.resetOTP = otp;
        user.otpExpiresIn = Date.now() + 5 * 60 * 1000; // 5 minutes

        await user.save();

        // Send Email
        const mailOptions = {
            from: `${process.env.APP_NAME || "Girl's Fashion"} <${process.env.SMTP_EMAIL}>`,
            to: user.email,
            subject: `Password Reset OTP - ${process.env.APP_NAME || "Girl's Fashion"}`,
            text: `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for 5 minutes.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ success: false, message: 'Error sending email' });
            } else {
                console.log('Email sent: ' + info.response);
                res.json({ success: true, message: 'OTP sent to your email' });
            }
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const user = await User.findOne({
            email,
            resetOTP: otp,
            otpExpiresIn: { $gt: Date.now() } // Check if OTP is not expired
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid OTP or OTP expired' });
        }

        // Update Password
        user.password = newPassword; // Will be hashed by pre-save hook
        user.resetOTP = undefined;
        user.otpExpiresIn = undefined;

        await user.save();

        res.json({ success: true, message: 'Password reset successful. Please login.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update Profile Picture
// @route   POST /api/auth/profile-pic
// @access  Private
const updateProfilePic = async (req, res) => {
    console.log("Profile Update Request Recieved"); // Log request start
    try {
        if (!req.file) {
            console.log("Error: No file uploaded");
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        console.log("Cloudinary Upload Success, URL:", req.file.path); // Log Cloudinary URL

        const user = await User.findById(req.user.id);

        if (!user) {
            console.log("Error: User not found");
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // --- Optimizing: Delete Old Image ---
        if (user.profilePic) {
            try {
                // Extract Public ID from Cloudinary URL
                const urlParts = user.profilePic.split('/');
                const versionIndex = urlParts.findIndex(part => part.startsWith('v') && !isNaN(part.substring(1)));

                let publicIdParts = [];
                if (versionIndex !== -1) {
                    publicIdParts = urlParts.slice(versionIndex + 1);
                } else {
                    const uploadIndex = urlParts.indexOf('upload');
                    if (uploadIndex !== -1) {
                        publicIdParts = urlParts.slice(uploadIndex + 1);
                    }
                }

                if (publicIdParts.length > 0) {
                    const publicIdWithExt = publicIdParts.join('/');
                    const publicId = publicIdWithExt.split('.')[0]; // Remove extension

                    console.log("Deleting Old Image with Public ID:", publicId);

                    // We need to access cloudinary directly here
                    const cloudinary = require('../config/cloudinary');
                    await cloudinary.uploader.destroy(publicId);
                    console.log("Old Image Deleted Successfully");
                }
            } catch (deleteError) {
                console.error("Error deleting old profile pic:", deleteError);
                // Continue to save new image even if delete fails
            }
        }
        // -------------------------------------

        user.profilePic = req.file.path; // Cloudinary URL
        await user.save();
        console.log("User Profile Picture Updated in DB for:", user.email);

        res.json({
            success: true,
            photoUrl: user.profilePic,
            message: 'Profile picture updated successfully'
        });
    } catch (error) {
        console.error('Profile Pic Upload Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.toString() });
    }
};

module.exports = {
    signup,
    login,
    getUser,
    forgotPassword,
    resetPassword,
    updateProfilePic,
};