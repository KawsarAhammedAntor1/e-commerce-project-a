const express = require('express');
const router = express.Router();
const {
    addOrderItems,
    getMyOrders,
    getAllOrders,
    updateOrderStatus,
    deleteOrder,
    deleteMyOrder,
    getOrderById
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware'); // Ensure you have 'admin' middleware

// 1. Order Placing & Admin List
// POST /api/orders (User places order)
// GET /api/orders (Admin sees all orders)
router.route('/')
    .post(protect, addOrderItems)
    .get(protect, admin, getAllOrders);

// 2. User Order History
// GET /api/orders/myorders
router.route('/myorders').get(protect, getMyOrders);

// DELETE /api/orders/myorders/:id (User Soft Delete)
router.route('/myorders/:id').delete(protect, deleteMyOrder);

// 3. Admin Status Update
// PATCH /api/orders/:id/status
router.route('/:id/status').patch(protect, admin, updateOrderStatus);

// 4. Admin Delete Order & Get Single Order
// DELETE /api/orders/:id
// GET /api/orders/:id
router.route('/:id')
    .delete(protect, admin, deleteOrder)
    .get(protect, getOrderById); // Removed 'admin' middleware to allow customers to view their own order

module.exports = router;