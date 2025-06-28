const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "products" },
  quantity: Number,
  price: Number,
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  items: [orderItemSchema],
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  orderDate: { type: Date, default: Date.now },
  totalAmount: { type: Number, default: 0 },
  couponApplied: { type: mongoose.Schema.Types.ObjectId, ref: "coupons", default: null },
});

module.exports = mongoose.model("Order", orderSchema);
