const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const router = express.Router();

// Home page
router.get("/", (req, res) => {
  res.render("index", { title: "Express" });
});

// User login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Username and password are required" 
      });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        _id: user._id, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email 
      },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );

    // Prepare response data
    const userData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      token
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: userData
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});

module.exports = router;