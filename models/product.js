const mongoose = require("mongoose");
const products = new mongoose.Schema({
  product_name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  img: String
}, { timestamps: true });
module.exports = mongoose.model("products", products);
