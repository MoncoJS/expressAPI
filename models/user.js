const mongoose = require("mongoose");
const users = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  email: { type: String, unique: true, required: true },
  phone: String,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model("users", users);
