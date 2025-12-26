const SSLCommerzPayment = require('sslcommerz-lts');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/orderModel');
require('dotenv').config();

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = process.env.IS_LIVE === 'true';

// Initialize Payment
exports.initPayment = async (req, res) => {
    try {
        console.log('Incoming Body:', JSON.stringify(req.body, null, 2));
        console.log('User:', req.user); // Debug log

        const { orderItems, shippingAddress, totalAmount, paymentMethod } = req.body;

        // 1. Map Order Items to match Schema (frontend sends 'name', schema needs 'productName')
        const mappedOrderItems = orderItems.map(item => ({
            productName: item.name || item.productName || 'Unknown Product',
            qty: item.qty || item.quantity,
            price: item.price,
            product: item.product || item.productId
        }));

        // 2. Create Transaction ID
        const tran_id = uuidv4();

        // 3. Save Initial Order to Database (Pending Payment)
        const order = new Order({
            user: req.user._id, // Assumes 'protect' middleware adds user to req
            orderItems: mappedOrderItems,
            shippingAddress,
            paymentMethod,
            totalAmount,
            transactionId: tran_id,
            paymentStatus: 'Pending',
            status: 'Pending'
        });

        await order.save();

        // 4. Prepare SSLCommerz Data
        // Robust fallback for email
        const customerEmail = (req.user && req.user.email) ? req.user.email : 'guest@girlsfashion.com';

        const data = {
            total_amount: totalAmount,
            currency: 'BDT',
            tran_id: tran_id, // Use unique tran_id for each API call
            success_url: `${process.env.SERVER_URL}/api/payment/success/${tran_id}`,
            fail_url: `${process.env.SERVER_URL}/api/payment/fail/${tran_id}`,
            cancel_url: `${process.env.SERVER_URL}/api/payment/cancel/${tran_id}`,
            ipn_url: `${process.env.SERVER_URL}/api/payment/ipn`,

            shipping_method: 'Courier',
            product_name: mappedOrderItems.map(item => item.productName).join(', '),
            product_category: 'Clothing',
            product_profile: 'general',
            cus_name: shippingAddress.name,
            cus_email: customerEmail,
            cus_add1: shippingAddress.address,
            cus_add2: shippingAddress.city,
            cus_city: shippingAddress.city,
            cus_state: shippingAddress.city,
            cus_postcode: '1000',
            cus_country: 'Bangladesh',
            cus_phone: shippingAddress.phone,
            cus_fax: shippingAddress.phone,
            ship_name: shippingAddress.name,
            ship_add1: shippingAddress.address,
            ship_add2: shippingAddress.city,
            ship_city: shippingAddress.city,
            ship_state: shippingAddress.city,
            ship_postcode: 1000,
            ship_country: 'Bangladesh',
        };

        console.log('SSLCommerz Data:', data); // Log prepared data for verifying email

        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        sslcz.init(data).then(apiResponse => {
            // Redirect the user to payment gateway
            let GatewayPageURL = apiResponse.GatewayPageURL;
            if (GatewayPageURL) {
                res.status(200).json({ url: GatewayPageURL });
            } else {
                console.log('SSLCommerz Response:', apiResponse);
                res.status(400).json({
                    message: 'Session was not successful',
                    apiResponse: apiResponse
                });
            }
        });

    } catch (error) {
        console.error('Payment Init Error:', error);
        res.status(500).json({
            message: error.message,
            stack: error.stack
        });
    }
};

// Payment Success
exports.paymentSuccess = async (req, res) => {
    const { tranId } = req.params;

    try {
        const order = await Order.findOne({ transactionId: tranId });
        if (order) {
            order.paymentStatus = 'Paid';
            order.status = 'Processing'; // Automatically move to processing if paid
            await order.save();
        }

        res.redirect(`${process.env.FRONTEND_URL}/success.html`);

    } catch (error) {
        console.error('Payment Success Error:', error);
        res.redirect('/fail.html');
    }
};

// Payment Fail
exports.paymentFail = async (req, res) => {
    const { tranId } = req.params;
    try {
        const order = await Order.findOne({ transactionId: tranId });
        if (order) {
            order.paymentStatus = 'Failed';
            await order.save();
        }
        res.redirect(`${process.env.FRONTEND_URL}/cart.html`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Payment Failed');
    }
};

// Payment Cancel
exports.paymentCancel = async (req, res) => {
    const { tranId } = req.params;
    try {
        const order = await Order.findOne({ transactionId: tranId });
        if (order) {
            order.paymentStatus = 'Cancelled';
            await order.save();
        }
        res.redirect(`${process.env.FRONTEND_URL}/cart.html`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Payment Cancelled');
    }
};
