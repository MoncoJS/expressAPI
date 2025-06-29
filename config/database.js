const mongoose = require("mongoose");
require("dotenv").config();

const { DB_HOST, DB_PORT, DB_NAME } = process.env;
const mongoURI = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
