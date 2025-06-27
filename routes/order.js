const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/product");
const verifyToken = require("../middleware/jwt_decode");
const router = express.Router();

// Helper function to validate product stock
async function validateProductStock(productId, quantity) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error(`Invalid   product id: ${productId}`);
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const stock = product.amount !== undefined ? product.amount : product.stock;
  if (stock < quantity) {
    throw new Error(`Insufficient stock for product ${productId}`);
  }

  return product;
}

// Helper: map image url for product in order
function mapOrderProductImageUrl(req, order) {
  if (!order) return order;
  const obj = order.toObject ? order.toObject() : order;
  if (obj.items && Array.isArray(obj.items)) {
    obj.items = obj.items.map(item => {
      if (item.product && item.product.img && !item.product.img.startsWith('http')) {
        item.product.img = `${req.protocol}://${req.get('host')}/uploads/${item.product.img}`;
      }
      return item;
    });
  }
  return obj;
}

// Get all orders for logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    const filter = req.auth?.firstName ? { customerName: req.auth.firstName } : {};
    const orders = await Order.find(filter).populate("items.product");
    // Map image url for each order
    const mapped = orders.map(order => mapOrderProductImageUrl(req, order));
    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: mapped
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders"
    });
  }
});

// Get order by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }

    const order = await Order.findById(id).populate("items.product");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: mapOrderProductImageUrl(req, order)
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order"
    });
  }
});

// Create or update order
router.post("/", verifyToken, async (req, res) => {
  try {
    let { customerName, items } = req.body;
    
    // Set customer name from auth if not provided
    if (!customerName && req.auth?.firstName) {
      customerName = req.auth.firstName;
    }

    // Validate all products in the order
    for (const item of items) {
      await validateProductStock(item.product, item.quantity);
    }

    // Find existing order for customer
    let order = await Order.findOne({ customerName });

    if (order) {
      // Update existing order
      await updateExistingOrder(order, items);
    } else {
      // Create new order
      order = await createNewOrder(customerName, items);
    }

    return res.status(201).json({
      success: true,
      message: order ? "Order updated successfully" : "Order created successfully",
      data: order
    });

  } catch (error) {
    console.error("Order processing error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to process order"
    });
  }
});

// Update cart (order) for current user
router.put("/", verifyToken, async (req, res) => {
  try {
    let { customerName, items } = req.body;
    if (!customerName && req.auth?.firstName) {
      customerName = req.auth.firstName;
    }
    if (!customerName) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required"
      });
    }
    // Find order for this customer
    let order = await Order.findOne({ customerName });
    if (!order) {
      // If not found, create new order
      order = new Order({ customerName, items: items || [] });
    } else {
      // Update items
      order.items = items || [];
    }
    await order.save();
    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: order
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update cart"
    });
  }
});

// Helper function to update existing order
async function updateExistingOrder(order, newItems) {
  // Merge items
  const itemMap = new Map();
  
  // Add existing items to map
  order.items.forEach(item => {
    const key = `${item.product}_${item.price}`;
    itemMap.set(key, {
      product: item.product,
      quantity: item.quantity,
      price: item.price
    });
  });

  // Add or update with new items, และเก็บจำนวนที่เพิ่มใหม่
  for (const newItem of newItems) {
    const key = `${newItem.product}_${newItem.price}`;
    const existingItem = itemMap.get(key);
    let addedQty = newItem.quantity;
    if (existingItem) {
      // จำนวนที่เพิ่มใหม่ = newItem.quantity
      existingItem.quantity += newItem.quantity;
    } else {
      itemMap.set(key, {
        product: newItem.product,
        quantity: newItem.quantity,
        price: newItem.price
      });
    }
    // ลด stock เฉพาะจำนวนที่เพิ่มใหม่
    const product = await Product.findById(newItem.product);
    const stockField = product.amount !== undefined ? "amount" : "stock";
    await Product.findByIdAndUpdate(
      newItem.product,
      { $inc: { [stockField]: -addedQty } }
    );
  }

  // Update order items
  order.items = Array.from(itemMap.values());
  await order.save();
  return order;
}

// Helper function to create new order
async function createNewOrder(customerName, items) {
  // Reduce stock for all items
  for (const item of items) {
    const product = await Product.findById(item.product);
    const stockField = product.amount !== undefined ? "amount" : "stock";
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { [stockField]: -item.quantity } }
    );
  }

  // Create and save new order
  const order = new Order({ customerName, items });
  await order.save();
  return order;
}

// Restore product stock (for cart item removal/clear)
router.post("/restore", verifyToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items array is required"
      });
    }
    for (const item of items) {
      if (!item.product || typeof item.quantity !== "number") continue;
      const product = await Product.findById(item.product);
      if (!product) continue;
      const stockField = product.amount !== undefined ? "amount" : "stock";
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { [stockField]: item.quantity } }
      );
    }
    return res.status(200).json({
      success: true,
      message: "Stock restored"
    });
  } catch (error) {
    console.error("Error restoring stock:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to restore stock"
    });
  }
});

module.exports = router;