const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./config/database");
connectDB();

const app = express();

// Configure CORS
const corsOptions = {
  origin: [
    'http://localhost:8080',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static file serving with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, 'public', 'uploads')));

app.use(express.static(path.join(__dirname, "public")));

app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));
app.use("/products", require("./routes/products"));
app.use("/orders", require("./routes/order"));
app.use("/coupons", require("./routes/coupon"));
app.use("/bills", require("./routes/bills"));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not Found" });
});

module.exports = app;