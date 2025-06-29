const mongoose = require("mongoose");
const products = new mongoose.Schema({
  product_name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  img: String,
  category: { type: String, default: 'ทั่วไป' } // เพิ่มฟิลด์หมวดหมู่สินค้า
}, { timestamps: true });
module.exports = mongoose.model("products", products);
