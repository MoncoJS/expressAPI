const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/jwt_decode");
const orderController = require("../controllers/orderController");

// Get all orders for logged-in user
router.get("/", verifyToken, orderController.getAllOrders);

// Get all completed orders for logged-in user
router.get("/completed", verifyToken, orderController.getCompletedOrders);

// Get order by ID
router.get("/:id", verifyToken, orderController.getOrderById);

// Create or update order (add to cart)
router.post("/", verifyToken, orderController.createOrUpdateOrder);

// Update cart (order) for current user
router.put("/", verifyToken, orderController.updateCart);

// Update specific order item quantity
router.put("/:id", verifyToken, orderController.updateOrderItem);

// Restore product stock (for cart item removal/clear)
router.post("/restore", verifyToken, orderController.restoreProductStock);

// New route for checkout selected items
router.post("/checkout", verifyToken, orderController.checkoutSelectedItems);

module.exports = router;