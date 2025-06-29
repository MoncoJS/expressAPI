const mongoose = require("mongoose");
const Order = require("../models/order");
const Product = require("../models/product");
const Coupon = require("../models/coupon"); // Import Coupon model

// Helper function to validate product stock
async function validateProductStock(productId, quantity) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error(`Invalid product id: ${productId}`);
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const stock = product.amount !== undefined ? product.amount : product.stock;
  if (stock < quantity) {
    throw new Error(`Insufficient stock for product ${product.product_name}. Available: ${stock}, Requested: ${quantity}`);
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
exports.getAllOrders = async (req, res) => {
  try {
    // Filter by userId and status 'pending' for cart
    const filter = { userId: req.user._id, status: 'pending' }; 
    const orders = await Order.find(filter).populate("items.product");
    
    console.log('Orders found:', orders.length); // Debug log
    if (orders.length > 0) {
      console.log('First order:', orders[0]); // Debug log
      console.log('First order items:', orders[0].items); // Debug log
      if (orders[0].items.length > 0) {
        console.log('First item product:', orders[0].items[0].product); // Debug log
      }
    }
    
    // Map image url for each order
    const mapped = orders.map(order => mapOrderProductImageUrl(req, order));
    
    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: mapped
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    console.error("Error stack:", error.stack); // More detailed error info
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all completed orders for logged-in user
exports.getCompletedOrders = async (req, res) => {
  try {
    // Filter by userId and status 'completed'
    const filter = { userId: req.user._id, status: 'completed' };
    const orders = await Order.find(filter).populate("items.product");
    // Map image url for each order
    const mapped = orders.map(order => mapOrderProductImageUrl(req, order));
    return res.status(200).json({
      success: true,
      message: "Completed orders retrieved successfully",
      data: mapped
    });
  } catch (error) {
    console.error("Error fetching completed orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve completed orders"
    });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
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
};

// Create or update order (add to cart)
exports.createOrUpdateOrder = async (req, res) => {
  try {
    const userId = req.user._id; // Get userId from authenticated user
    let { items } = req.body;
    
    // Validate all products in the order
    for (const item of items) {
      await validateProductStock(item.product, item.quantity);
    }

    // Find existing pending order for user
    let order = await Order.findOne({ userId, status: 'pending' });

    if (order) {
      // Update existing order
      await updateExistingOrder(order, items);
    } else {
      // Create new order
      order = await createNewOrder(userId, items);
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
};

// Update cart (order) for current user
exports.updateCart = async (req, res) => {
  try {
    const userId = req.user._id; // Get userId from authenticated user
    let { items } = req.body;
    
    // Find pending order for this user
    let order = await Order.findOne({ userId, status: 'pending' });
    if (!order) {
      // If not found, create new pending order
      order = new Order({ userId, items: items || [], status: 'pending' });
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
};

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
async function createNewOrder(userId, items) {
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
  const order = new Order({ userId, items, status: 'pending' });
  await order.save();
  return order;
}

// Restore product stock (for cart item removal/clear)
exports.restoreProductStock = async (req, res) => {
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
};

// New function: Checkout selected items
exports.checkoutSelectedItems = async (req, res) => {
  try {
    const userId = req.user._id; // Get userId from authenticated user
    const { selectedItems, couponCode } = req.body; // selectedItems: [{ _id, quantity, price, product: productId }], couponCode: string

    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      return res.status(400).json({ success: false, message: "No items selected for checkout." });
    }

    let currentPendingOrder = await Order.findOne({ userId, status: 'pending' });
    if (!currentPendingOrder) {
      return res.status(404).json({ success: false, message: "No pending order found for this user." });
    }

    let totalAmount = 0;
    let itemsToProcess = [];
    let itemsToKeepInCart = [];

    // Validate stock and separate selected from unselected items
    for (const selectedItem of selectedItems) {
      const product = await validateProductStock(selectedItem.product, selectedItem.quantity);
      // Ensure the selected item is actually in the current pending order
      const existingCartItemIndex = currentPendingOrder.items.findIndex(item => 
        item.product.toString() === selectedItem.product.toString() && item.quantity >= selectedItem.quantity
      );

      if (existingCartItemIndex === -1) {
        throw new Error(`Selected item ${selectedItem.product} not found in cart or quantity exceeds cart quantity.`);
      }

      // Reduce stock for selected items
      const stockField = product.amount !== undefined ? "amount" : "stock";
      await Product.findByIdAndUpdate(
        selectedItem.product,
        { $inc: { [stockField]: -selectedItem.quantity } }
      );

      totalAmount += selectedItem.price * selectedItem.quantity;
      itemsToProcess.push(selectedItem);

      // Adjust quantity in pending order or remove if fully selected
      if (currentPendingOrder.items[existingCartItemIndex].quantity === selectedItem.quantity) {
        // Item fully selected, remove from pending order
        currentPendingOrder.items.splice(existingCartItemIndex, 1);
      } else {
        // Partial selection, reduce quantity in pending order
        currentPendingOrder.items[existingCartItemIndex].quantity -= selectedItem.quantity;
      }
    }

    // Apply coupon if provided
    let appliedCouponId = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon || new Date(coupon.expirationDate) < new Date()) {
        return res.status(400).json({ success: false, message: "Invalid or expired coupon code." });
      }
      appliedCouponId = coupon._id;

      if (coupon.discountType === 'percentage') {
        totalAmount -= (totalAmount * coupon.discountValue) / 100;
      } else if (coupon.discountType === 'fixed') {
        totalAmount -= coupon.discountValue;
      }
      totalAmount = Math.max(0, totalAmount); // Ensure total doesn't go below zero
    }

    // Create a new completed order (bill)
    const completedOrder = new Order({
      userId,
      items: itemsToProcess,
      status: 'completed',
      orderDate: new Date(),
      totalAmount: totalAmount,
      couponApplied: appliedCouponId,
    });
    await completedOrder.save();

    // Update the pending order (cart) with remaining items
    currentPendingOrder.items = currentPendingOrder.items.filter(item => item.quantity > 0); // Remove items with 0 quantity
    await currentPendingOrder.save();

    return res.status(200).json({
      success: true,
      message: "Checkout successful!",
      data: completedOrder,
    });

  } catch (error) {
    console.error("Checkout error:", error);
    return res.status(400).json({ success: false, message: error.message || "Failed to process checkout." });
  }
};

// Update specific order item quantity
exports.updateOrderItem = async (req, res) => {
  try {
    const { id } = req.params; // Order ID
    const { quantity } = req.body;
    const userId = req.user._id;

    // Validate quantity
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1"
      });
    }

    // Find the order by ID and ensure it belongs to the user
    const order = await Order.findOne({ _id: id, userId, status: 'pending' }).populate('items.product');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not accessible"
      });
    }

    // If this is a single-item order, update the first item
    if (order.items.length === 1) {
      const item = order.items[0];
      
      // Validate stock for the new quantity
      await validateProductStock(item.product._id, quantity);
      
      // Update quantity
      order.items[0].quantity = quantity;
    } else {
      // For multi-item orders, this approach might need modification
      // For now, we'll update the first matching item
      if (order.items.length > 0) {
        order.items[0].quantity = quantity;
      }
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order item updated successfully",
      data: mapOrderProductImageUrl(req, order)
    });

  } catch (error) {
    console.error("Error updating order item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update order item"
    });
  }
};