const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/product");
const verifyToken = require("../middleware/jwt_decode");
const router = express.Router();

// Get all orders (เฉพาะของ user ที่ login)
router.get("/", verifyToken, async (req, res) => {
  try {
    let filter = {};
    if (req.auth && req.auth.firstName) {
      filter.customerName = req.auth.firstName;
    }
    const orders = await Order.find(filter).populate("items.product");
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
router.get("/:id", verifyToken, async (req, res) => {
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

// Create or update order (รวมสินค้าเดิม, ตัด stock เฉพาะจำนวนที่เพิ่ม)
router.post("/", verifyToken, async (req, res) => {
  try {
    let { customerName, items } = req.body;
    if ((!customerName || customerName === "") && req.auth && req.auth.firstName) {
      customerName = req.auth.firstName;
    }

    // ตรวจสอบ ObjectId และ stock สำหรับสินค้าที่จะเพิ่ม
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
      const stock = product.amount !== undefined ? product.amount : product.stock;
      if (stock < item.quantity) {
        return res.status(400).send({
          message: `Stock not enough for product ${item.product}`,
          success: false,
        });
      }
    }

    // หา order เดิมของ user นี้
    let order = await Order.findOne({ customerName });

    if (order) {
      // รวมสินค้าใหม่กับสินค้าเดิม (product+price เป็น key)
      const mergedMap = {};
      // ใส่สินค้าเดิมลง map
      for (const oldItem of order.items) {
        const key = oldItem.product.toString() + "_" + oldItem.price;
        mergedMap[key] = {
          product: oldItem.product,
          quantity: oldItem.quantity,
          price: oldItem.price,
        };
      }
      // รวมสินค้าจาก items ใหม่
      for (const newItem of items) {
        const key = newItem.product + "_" + newItem.price;
        if (mergedMap[key]) {
          mergedMap[key].quantity += newItem.quantity;
        } else {
          mergedMap[key] = {
            product: newItem.product,
            quantity: newItem.quantity,
            price: newItem.price,
          };
        }
      }
      // ตัด stock เฉพาะจำนวนที่เพิ่มใหม่
      for (const newItem of items) {
        const product = await Product.findById(newItem.product);
        const stockField = product.amount !== undefined ? "amount" : "stock";
        await Product.findByIdAndUpdate(
          newItem.product,
          { $inc: { [stockField]: -newItem.quantity } }
        );
      }
      // อัปเดต order
      order.items = Object.values(mergedMap);
      await order.save();
      return res.status(201).send({
        data: order,
        message: "Order updated successfully",
        success: true,
      });
    } else {
      // ตัด stock
      for (let item of items) {
        const product = await Product.findById(item.product);
        const stockField = product.amount !== undefined ? "amount" : "stock";
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { [stockField]: -item.quantity } }
        );
      }
      // สร้าง order ใหม่
      order = new Order({ customerName, items });
      await order.save();
      return res.status(201).send({
        data: order,
        message: "Order created successfully",
        success: true,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: "Error creating order",
      success: false,
    });
  }
});

module.exports = router;
