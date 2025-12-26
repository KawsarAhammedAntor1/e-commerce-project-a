const asyncHandler = require('express-async-handler');
// FIX: File paths updated to match your project structure
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');

const mongoose = require('mongoose');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  // Check if user ID is valid ObjectId (handles 'master-admin-id' case)
  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    return res.status(200).json({ items: [] });
  }

  // Find cart and populate product details including ALL price fields
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: 'items.product',
    select: 'name image price regularPrice offerPrice stock' // Added stock
  });

  if (!cart) {
    // If no cart exists, return empty items array instead of 404
    return res.status(200).json({ items: [] });
  }

  res.status(200).json(cart);
});

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const qtyToAdd = quantity || 1;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Find the user's cart
  let cart = await Cart.findOne({ user: req.user._id });

  if (cart) {
    // Check if product is already in the cart
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      // Product exists, update quantity
      const newQty = cart.items[itemIndex].quantity + qtyToAdd;

      // Stock Check (Backend Validation)
      // If updating (not just setting), check if newQty > stock
      // We assume product.stock is managed.
      if (newQty > product.stock) {
        res.status(400);
        throw new Error(`Out of Stock! Only ${product.stock} available.`);
      }

      cart.items[itemIndex].quantity = newQty;
    } else {
      // Product not in cart, check stock first
      if (qtyToAdd > product.stock) {
        res.status(400);
        throw new Error(`Out of Stock! Only ${product.stock} available.`);
      }
      cart.items.push({ product: productId, quantity: qtyToAdd });
    }
  } else {
    // No cart exists, create a new one, check stock first
    if (qtyToAdd > product.stock) {
      res.status(400);
      throw new Error(`Out of Stock! Only ${product.stock} available.`);
    }
    cart = await Cart.create({
      user: req.user._id,
      items: [{ product: productId, quantity: qtyToAdd }]
    });
  }

  await cart.save();
  res.status(200).json({ message: 'Product added to cart', cart });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:id
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  // The ID in params is the PRODUCT ID
  const productId = req.params.id;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  // Filter out the item (Keep items that do NOT match the productId)
  cart.items = cart.items.filter(item => item.product.toString() !== productId);

  await cart.save();

  res.status(200).json({ message: 'Item removed from cart', cart });
});

// Export functions using the names expected by cartRoutes.js
module.exports = {
  getCart,
  addToCart,
  removeFromCart,
};