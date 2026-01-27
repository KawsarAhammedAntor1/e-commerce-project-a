const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

// Route files
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');     // ✅ Linked Correctly
const authRoutes = require('./routes/authRoutes');       // ✅ Linked Correctly
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');       // ✅ Linked Correctly
const paymentRoutes = require('./routes/paymentRoutes'); // ✅ Linked Payment Routes

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Enable CORS (Allows frontend to talk to backend)
// Enable CORS (Allows frontend to talk to backend)
app.use(cors({
    origin: [
        'https://ronginpalok.com',
        'https://www.ronginpalok.com',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000'
    ],
    credentials: true
}));

// Body parser (Allows reading JSON from body)
// Body parser (Allows reading JSON from body)
app.use(express.json());

// Initialize Passport
require('./config/passport');
const passport = require('passport');
app.use(passport.initialize());

// Mount routers
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);      // Matches fetch('/api/orders')
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);         // Matches fetch('/api/cart')
app.use('/api/payment', paymentRoutes);   // Matches fetch('/api/payment')
app.use('/api/settings', require('./routes/settingsRoutes')); // ✅ Linked Settings Routes

// ✅ CONFIG API: Frontend কে .env এর তথ্য জানানোর জন্য (New Added)
app.get('/api/config', (req, res) => {
    res.json({
        enableBkash: process.env.ENABLE_BKASH === 'true'
    });
});

// --- New Route: Restrict Contact Us for Admins ---
const jwt = require('jsonwebtoken');

// Protect Cart Page: Admin should not access
app.get('/cart.html', async (req, res, next) => {
    let token;
    // Check for token in header (standard API)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const User = require('./models/userModel'); // Ensure User model is available
            const user = await User.findById(decoded.id);

            if (user && user.role === 'admin') {
                // If admin, redirect them away from the cart page
                return res.redirect('/admin.html'); // Or another appropriate page
            }
        } catch (error) {
            console.error('Token verification failed in cart route:', error);
            // Treat as guest/non-admin if token fails
        }
    }

    // If not Admin (User or Guest), allow access
    // Serve the file (assuming it exists in frontend folder relative to here)
    res.sendFile(path.join(__dirname, '../frontend/cart.html'));
});

// Optional: Serve Uploads folder statically (if storing images locally)
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

app.get('/contact.html', async (req, res, next) => {
    let token;
    // Check for token in header (standard API) or maybe cookie if configured (not standard here but logical fallback)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Assuming role is in token or we fetch user. To be safe, let's fetch user if needed, 
            // but usually role is payload. Check authMiddleware; it fetches user.
            // Let's decode and check.
            const User = require('./models/userModel');
            const user = await User.findById(decoded.id);

            if (user && user.role === 'admin') {
                return res.redirect('/admin.html'); // Redirect Admins
            }
        } catch (error) {
            console.error('Token verification failed in contact route:', error);
            // Treat as guest if token fails
        }
    }

    // If not Admin (User or Guest), allow access
    // Serve the file (assuming it exists in frontend folder relative to here)
    res.sendFile(path.join(__dirname, '../frontend/contact.html'));
});

// Serve Frontend Static Files
// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve at root
app.use('/frontend', express.static(path.join(__dirname, '../frontend'))); // Serve at /frontend for compatibility

// Fallback for root (express.static handles index.html usually, but just in case)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Basic Error Handling Middleware
app.use((err, req, res, next) => {
    // If status code is 200 (default), set it to 500 (server error)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`Server URL: http://0.0.0.0:${PORT}`);
});