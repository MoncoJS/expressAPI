const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/product");
const router = express.Router();

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().populate("items.product");
    return res.status(200).send({
      data: orders,
      message: "Orders retrieved successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error retrieving orders",
      success: false,
    });
  }
});

// Get order by ID
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid order ID",
        success: false,
      });
    }
    const order = await Order.findById(id).populate("items.product");
    return res.status(200).send({
      data: order,
      message: "Order retrieved successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error retrieving order",
      success: false,
    });
  }
});

// Create order (ตัด stock อัตโนมัติ)
router.post("/", async (req, res) => {
  try {
    const { customerName, items } = req.body;

    // ตรวจสอบ ObjectId และ stock
    for (let item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        return res.status(400).send({
          message: `Invalid product id: ${item.product}`,
          success: false,
        });
      }
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).send({
          message: `Product not found: ${item.product}`,
          success: false,
        });
      }
      // ปรับตรงนี้ให้รองรับทั้ง amount และ stock
      const stock = product.amount !== undefined ? product.amount : product.stock;
      if (stock < item.quantity) {
        return res.status(400).send({
          message: `Stock not enough for product ${item.product}`,
          success: false,
        });
      }
    }

    // ตัด stock
    for (let item of items) {
      const product = await Product.findById(item.product);
      const stockField = product.amount !== undefined ? "amount" : "stock";
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { [stockField]: -item.quantity } }
      );
    }

    // สร้าง order
    const order = new Order({ customerName, items });
    await order.save();
    return res.status(201).send({
      data: order,
      message: "Order created successfully",
      success: true,
    });
  } catch (error) {
    console.error(error); // เพิ่ม log
    return res.status(500).send({
      message: "Error creating order",
      success: false,
    });
  }
});

module.exports = router;
