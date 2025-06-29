const mongoose = require("mongoose");
const users = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  address: { type: String, trim: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model("users", users);
