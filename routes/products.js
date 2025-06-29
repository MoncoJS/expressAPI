const express = require("express");
const Product = require("../models/product");
const upload = require("../middleware/image");
const verifyToken = require("../middleware/jwt_decode");
const admin = require("../middleware/admin");
const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    // Map image URL
    const mapped = products.map(p => ({ ...p.toObject(), img: p.img ? `/uploads/${p.img}` : '' }));
    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: mapped
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products"
    });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: { ...product.toObject(), img: product.img ? `/uploads/${product.img}` : '' }
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve product"
    });
  }
});

// Create new product
router.post("/", verifyToken, admin, upload.single("image"), async (req, res) => {
  try {
    const { product_name, price, amount, description, category } = req.body;
    const img = req.file ? req.file.filename : "";

    // Validate required fields
    if (!product_name || !price || !amount) {
      return res.status(400).json({
        success: false,
        message: "Product name, price and amount are required"
      });
    }

    const product = new Product({ 
      product_name, 
      price, 
      amount, 
      description, 
      category: category || 'ทั่วไป',
      img 
    });
    await product.save();
    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: { ...product.toObject(), img: img ? `/uploads/${img}` : '' }
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create product"
    });
  }
});

// Upload image endpoint
router.post("/upload", verifyToken, admin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      filename: req.file.filename
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload file"
    });
  }
});

// Update product
router.put("/:id", verifyToken, admin, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    const update = { ...req.body };
    // If uploading new image, replace img field
    if (req.file) update.img = req.file.filename;

    const product = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: { ...product.toObject(), img: product.img ? `/uploads/${product.img}` : '' }
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update product"
    });
  }
});

// Delete product
router.delete("/:id", verifyToken, admin, async (req, res) => {
  try {
    const { id } = req.params;

    await Product.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete product"
    });
  }
});

// Get product image with proper CORS headers
router.get("/image/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const path = require('path');
    const fs = require('fs');
    
    // Decode the filename
    const decodedFilename = decodeURIComponent(filename);
    const imagePath = path.join(__dirname, '../public/uploads', decodedFilename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      });
    }
    
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Set content type based on file extension
    const ext = path.extname(decodedFilename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    const contentType = contentTypes[ext] || 'image/jpeg';
    res.contentType(contentType);
    
    // Send the file
    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error serving image:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to serve image"
    });
  }
});

module.exports = router;