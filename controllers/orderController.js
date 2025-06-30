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
    
    // Clean up orders by removing items with null products
    const cleanedOrders = orders.map(order => {
      const validItems = order.items.filter(item => item.product !== null);
      return {
        ...order.toObject(),
        items: validItems
      };
    });
    
    // Update the database to remove items with null products
    for (const order of orders) {
      const validItems = order.items.filter(item => item.product !== null);
      if (validItems.length !== order.items.length) {
        console.log(`Cleaning order ${order._id}: removing ${order.items.length - validItems.length} invalid items`);
        order.items = validItems;
        await order.save();
      }
    }
    
    // Map image url for each order
    const mapped = cleanedOrders.map(order => mapOrderProductImageUrl(req, order));
    
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
      return res.status(400).json({ success: false, message: "ไม่มีสินค้าที่เลือกสำหรับการสั่งซื้อ" });
    }

    let currentPendingOrder = await Order.findOne({ userId, status: 'pending' });
    if (!currentPendingOrder) {
      return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อที่รอดำเนินการสำหรับผู้ใช้นี้" });
    }

    let totalAmount = 0;
    let itemsToProcess = [];
    let stockErrors = [];

    // Validate stock and check availability
    for (const selectedItem of selectedItems) {
      try {
        const product = await validateProductStock(selectedItem.product, selectedItem.quantity);
        
        // Ensure the selected item is actually in the current pending order
        const existingCartItemIndex = currentPendingOrder.items.findIndex(item => 
          item.product && item.product.toString() === selectedItem.product.toString()
        );

        if (existingCartItemIndex === -1) {
          stockErrors.push(`สินค้า ${product.product_name} ไม่พบในตะกร้าสินค้า`);
          continue;
        }

        const cartItem = currentPendingOrder.items[existingCartItemIndex];
        if (cartItem.quantity < selectedItem.quantity) {
          stockErrors.push(`สินค้า ${product.product_name} มีจำนวนในตะกร้าไม่เพียงพอ (มี ${cartItem.quantity} ชิ้น แต่ต้องการ ${selectedItem.quantity} ชิ้น)`);
          continue;
        }

        totalAmount += selectedItem.price * selectedItem.quantity;
        itemsToProcess.push({
          ...selectedItem,
          productName: product.product_name
        });

      } catch (error) {
        // Extract product name from error message or use product ID
        const productName = error.message.includes('product ') ? 
          error.message.split('product ')[1].split('.')[0] : 
          selectedItem.product;
        stockErrors.push(`${productName}: ${error.message}`);
      }
    }

    // If there are stock errors, return them
    if (stockErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "มีปัญหากับสินค้าบางรายการ",
        errors: stockErrors,
        details: stockErrors.join(', ')
      });
    }

    // If no valid items to process
    if (itemsToProcess.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "ไม่มีสินค้าที่สามารถสั่งซื้อได้" 
      });
    }

    // Process valid items
    for (const item of itemsToProcess) {
      // Reduce stock for selected items
      const product = await Product.findById(item.product);
      const stockField = product.amount !== undefined ? "amount" : "stock";
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { [stockField]: -item.quantity } }
      );

      // Remove or reduce quantity from pending order
      const existingCartItemIndex = currentPendingOrder.items.findIndex(cartItem => 
        cartItem.product && cartItem.product.toString() === item.product.toString()
      );

      if (existingCartItemIndex !== -1) {
        if (currentPendingOrder.items[existingCartItemIndex].quantity === item.quantity) {
          // Item fully selected, remove from pending order
          currentPendingOrder.items.splice(existingCartItemIndex, 1);
        } else {
          // Partial selection, reduce quantity in pending order
          currentPendingOrder.items[existingCartItemIndex].quantity -= item.quantity;
        }
      }
    }

    // Apply coupon if provided
    let appliedCouponId = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon || new Date(coupon.expirationDate) < new Date()) {
        return res.status(400).json({ success: false, message: "รหัสคูปองไม่ถูกต้องหรือหมดอายุแล้ว" });
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
      items: itemsToProcess.map(item => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price
      })),
      status: 'completed',
      orderDate: new Date(),
      totalAmount: totalAmount,
      couponApplied: appliedCouponId,
    });
    await completedOrder.save();

    // Update the pending order (cart) with remaining items
    currentPendingOrder.items = currentPendingOrder.items.filter(item => item.quantity > 0);
    await currentPendingOrder.save();

    return res.status(200).json({
      success: true,
      message: "สั่งซื้อสำเร็จ!",
      data: completedOrder,
      orderNumber: completedOrder._id
    });

  } catch (error) {
    console.error("Checkout error:", error);
    return res.status(400).json({ 
      success: false, 
      message: error.message || "ไม่สามารถดำเนินการสั่งซื้อได้" 
    });
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