const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  quantity: Number,
  price: Number,
});

const orderSchema = new mongoose.Schema({
  customerName: String,
  items: [orderItemSchema],
});

module.exports = mongoose.model("Order", orderSchema);
