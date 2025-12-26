const express = require('express');
const router = express.Router();
const { initPayment, paymentSuccess, paymentFail, paymentCancel } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Initialize Payment (Protected Route)
router.post('/init', protect, initPayment);

// Payment Callbacks (Public, called by SSLCommerz)
router.post('/success/:tranId', paymentSuccess);
router.post('/fail/:tranId', paymentFail);
router.post('/cancel/:tranId', paymentCancel);

// Also need to handle them as GET in case SSLCommerz redirects via GET? 
// Standard is POST, but sometimes ... let's support both just in case if needed, or stick to POST.
// Documentation says POST.

module.exports = router;
