const asyncHandler = require('express-async-handler');
const Order = require('../models/orderModel'); // Ensure filename matches exactly
const Cart = require('../models/cartModel'); // Ensure filename matches exactly

// @desc 	Create new order
// @route 	POST /api/orders
// @access 	Private
const Product = require('../models/productModel'); // Ensure Product is imported

// @desc 	Create new order
// @route 	POST /api/orders
// @access 	Private
const addOrderItems = asyncHandler(async (req, res) => {
    const {
        orderItems,
        shippingAddress,
        paymentMethod,
        totalAmount
    } = req.body;

    if (orderItems && orderItems.length === 0) {
        res.status(400);
        throw new Error('No order items');
    } else {
        // Create the order
        const order = new Order({
            user: req.user._id,
            orderItems: orderItems.map(x => ({
                qty: x.qty,
                price: x.price,
                // Ensure product ID and name are mapped correctly
                product: x.product,
                productName: x.name,
                image: x.image,
            })),
            shippingAddress,
            paymentMethod,
            totalAmount,
            status: 'Pending',
            statusHistory: [ // Initialize history with Pending
                {
                    status: 'Pending',
                    timestamp: new Date(),
                    updatedBy: 'System' // Initial status
                }
            ]
        });

        // Decrement Stock
        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.stock = product.stock - item.qty;
                if (product.stock < 0) product.stock = 0; // Prevent negative
                await product.save();
            }
        }

        const createdOrder = await order.save();

        // Clear User Cart after successful order
        await Cart.findOneAndDelete({ user: req.user._id });

        res.status(201).json(createdOrder);
    }
});

// @desc 	Get logged in user orders
// @route 	GET /api/orders/myorders
// @access 	Private
// @desc 	Get logged in user orders
// @route 	GET /api/orders/myorders
// @access 	Private
const getMyOrders = asyncHandler(async (req, res) => {
    // Filter: Only show orders not deleted by user
    const orders = await Order.find({ user: req.user._id, showToUser: true }).sort({ createdAt: -1 });
    res.json(orders);
});

// @desc 	Get all orders (For Admin)
// @route 	GET /api/orders
// @access 	Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
    // Filter: Only show orders not deleted by admin
    const orders = await Order.find({ showToAdmin: true })
        .populate('user', 'id name email')
        .sort({ createdAt: -1 });

    res.json(orders);
});

// @desc 	Update order status (For Admin)
// @route 	PATCH /api/orders/:id/status
// @access 	Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        console.log(`Updating order ${req.params.id} to ${req.body.status} by ${req.user.name}`);

        const oldStatus = order.status;
        order.status = req.body.status;

        // Ensure statusHistory exists
        if (!order.statusHistory) {
            order.statusHistory = [];
        }

        // Push to timeline history
        order.statusHistory.push({
            status: req.body.status,
            timestamp: new Date(),
            updatedBy: (req.user && req.user.name) ? req.user.name : 'Admin' // Fallback if name missing
        });

        // Stock Restoration on Cancellation
        if (req.body.status === 'Cancelled' && oldStatus !== 'Cancelled') {
            for (const item of order.orderItems) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock += item.qty;
                    await product.save();
                }
            }
        }

        const updatedOrder = await order.save();
        console.log('Order updated:', updatedOrder.statusHistory);

        // ============================================================
        // SMART DELETION LOGIC (Per User Request)
        // Permanently delete product if Stock is 0 AND No Active Orders remain
        // ============================================================
        if (req.body.status === 'Delivered') {
            try {
                const cloudinary = require('../config/cloudinary');

                for (const item of order.orderItems) {
                    const product = await Product.findById(item.product);

                    if (product && product.stock <= 0) {
                        // Check for ANY other active orders (Pending, Processing, Shipped)
                        // Excluding the current order (which is now Delivered)
                        const otherActiveOrders = await Order.countDocuments({
                            _id: { $ne: order._id },
                            'orderItems.product': item.product,
                            status: { $nin: ['Delivered', 'Cancelled'] }
                        });

                        if (otherActiveOrders === 0) {
                            console.log(`[Smart Deletion] Product ${product.name} (ID: ${product._id}) has 0 stock and no active orders. Deleting...`);

                            // 1. Delete Image from Cloudinary
                            if (product.public_id) {
                                await cloudinary.uploader.destroy(product.public_id);
                                console.log(`[Smart Deletion] Image deleted from Cloudinary: ${product.public_id}`);
                            }

                            // 2. Permanently Delete Product from DB
                            await Product.findByIdAndDelete(product._id);
                            console.log(`[Smart Deletion] Product document deleted from Database.`);
                        } else {
                            console.log(`[Smart Deletion] Skipped deletion for ${product.name}. Active orders found: ${otherActiveOrders}`);
                        }
                    }
                }
            } catch (err) {
                console.error("[Smart Deletion Error]", err);
                // We do NOT throw error here, so we don't break the response for the Admin
            }
        }
        // ============================================================

        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc 	Delete order (Admin Soft Delete)
// @route 	DELETE /api/orders/:id
// @access 	Private/Admin
// @desc 	Delete order (Admin Soft Delete)
// @route 	DELETE /api/orders/:id
// @access 	Private/Admin
const deleteOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        // Check if User has already hidden it
        // We use strict check against false. If undefined (legacy), it counts as visible (true).
        if (order.showToUser === false) {
            // BOTH are false -> Permanent Delete
            await Order.findByIdAndDelete(req.params.id);
            res.json({ message: 'Order permanently deleted (Both sides removed)' });
        } else {
            // Soft Delete for Admin
            await Order.findByIdAndUpdate(req.params.id, { showToAdmin: false });
            res.json({ message: 'Order removed from Admin View' });
        }
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc 	Delete user order (User Soft Delete)
// @route 	DELETE /api/orders/myorders/:id
// @access 	Private
const deleteMyOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        // Validation: Verify ownership
        if (order.user.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error('Not authorized to delete this order');
        }

        // Check if Admin has already hidden it
        if (order.showToAdmin === false) {
            // BOTH are false -> Permanent Delete
            await Order.findByIdAndDelete(req.params.id);
            res.json({ message: 'Order permanently deleted (Both sides removed)' });
        } else {
            // Soft Delete for User
            await Order.findByIdAndUpdate(req.params.id, { showToUser: false });
            res.json({ message: 'Order removed from History' });
        }
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc 	Get order by ID
// @route 	GET /api/orders/:id
// @access 	Private
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name email')
        .populate({
            path: 'orderItems.product',
            select: 'image'
        });

    if (order) {
        // Check for permission: Admin or Order Owner
        if (req.user.role === 'admin' || order.user._id.equals(req.user._id)) {
            res.json(order);
        } else {
            res.status(401);
            throw new Error('Not authorized to view this order');
        }
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

module.exports = {
    addOrderItems,
    getMyOrders,
    getAllOrders,
    updateOrderStatus,
    deleteOrder,
    deleteMyOrder,
    getOrderById
};