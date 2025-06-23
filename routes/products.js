const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/product");
const upload = require("../middleware/image");
const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: products
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
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

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
      data: product
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
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { product_name, price, amount, description } = req.body;
    const image = req.file ? req.file.filename : "";

    // Validate required fields
    if (!product_name || !price || !amount) {
      return res.status(400).json({
        success: false,
        message: "Product name, price and amount are required"
      });
    }

    const newProduct = new Product({
      product_name,
      price: parseFloat(price),
      amount: parseInt(amount),
      img: image,
      description: description || ""
    });

    const savedProduct = await newProduct.save();
    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: savedProduct
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create product"
    });
  }
});

// Update product
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const updateData = { ...req.body };
    
    // Convert numeric fields
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.amount) updateData.amount = parseInt(updateData.amount);

    const updatedProduct = await Product.findByIdAndUpdate(
      id, 
      { $set: updateData },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct
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
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const result = await Product.deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const products = await Product.find();
    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: products
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete product"
    });
  }
});

module.exports = router;