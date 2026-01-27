const Product = require('../models/productModel');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const { category, showAll } = req.query;
        let filter = {};

        if (category) {
            filter.category = category;
        }

        // Invisible Logic: Only show products with stock > 0 unless 'showAll' is requested (e.g. by Admin)
        if (showAll !== 'true') {
            filter.stock = { $gt: 0 };
        }

        const products = await Product.find(filter);
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin)
// @desc    Create a product (Bulk Upload Support)
// @route   POST /api/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
    try {
        console.log('Create Product Request Body:', req.body);

        let files = [];
        if (req.files && req.files.length > 0) {
            files = req.files;
        } else if (req.file) {
            files = [req.file];
        }

        if (files.length === 0) {
            return res.status(400).json({ message: 'At least one image file is required' });
        }

        const { name, category, description, regularPrice, offerPrice, stock, timer, materials, work, sizes, lengths } = req.body;

        // Process arrays
        const sizesArray = sizes ? sizes.split(',').map(s => s.trim()).filter(s => s !== '') : [];
        const lengthsArray = lengths ? lengths.split(',').map(s => s.trim()).filter(s => s !== '') : [];

        // Create a product for EACH file
        const productPromises = files.map(file => {
            return new Product({
                name,
                category,
                description,
                image: file.path, // Unique image for each product
                public_id: file.filename, // Store Cloudinary Public ID
                regularPrice: Number(regularPrice),
                offerPrice: offerPrice ? Number(offerPrice) : undefined,
                stock: Number(stock),
                materials,
                work,
                sizes: sizesArray,
                lengths: lengthsArray,
                timer: timer ? new Date(timer) : undefined,
            }).save();
        });

        const createdProducts = await Promise.all(productPromises);

        res.status(201).json({
            message: `Successfully created ${createdProducts.length} products`,
            products: createdProducts
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            // --- Delete Image from Cloudinary ---
            let publicId = product.public_id; // Try getting from DB first

            // Backward Compatibility: If no public_id in DB, parse from URL
            if (!publicId && product.image) {
                try {
                    const urlParts = product.image.split('/');
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
                        publicId = publicIdWithExt.split('.')[0];
                    }
                } catch (parseError) {
                    console.error("Error parsing image URL:", parseError);
                }
            }

            if (publicId) {
                try {
                    console.log("Deleting Product Image with Public ID:", publicId);
                    const cloudinary = require('../config/cloudinary');
                    await cloudinary.uploader.destroy(publicId);
                    console.log("Product Image Deleted from Cloudinary");
                } catch (imgError) {
                    console.error("Failed to delete image from Cloudinary:", imgError);
                }
            }
            // ------------------------------------

            await Product.findByIdAndDelete(req.params.id); // Hard Delete
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    deleteProduct
};