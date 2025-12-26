const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
        trim: true,
    },
    image: { // Single image URL from Cloudinary
        type: String,
        required: true, // Making image required for a product
    },
    public_id: { // Cloudinary Public ID for deletion
        type: String,
    },
    regularPrice: { // Replaced 'price'
        type: Number,
        required: true,
    },
    offerPrice: { // Replaced 'discountPrice'
        type: Number,
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
    },
    description: {
        type: String,
        required: true,
    },
    materials: {
        type: String,
        default: ''
    },
    work: {
        type: String,
        default: ''
    },
    sizes: {
        type: [String], // Array of strings e.g., ['36', '38']
        default: []
    },
    lengths: {
        type: [String], // Array of strings e.g., ['38', '40']
        default: []
    },
    timer: { // Replaced 'isHotDeal' and 'dealEndTime'
        type: Date, // Date/Time for hot deals countdown
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt timestamps
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
