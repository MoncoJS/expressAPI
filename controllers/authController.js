const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");

exports.login = async (req, res) => {
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
    console.log("User object from DB:", user);
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
        username: user.username, // Add username to token payload
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email,
        role: user.role // Add user role to token payload
      },
      process.env.JWT_KEY,
    );

    // Prepare response data
    const userData = {
      _id: user._id,
      username: user.username, // Include username in response data
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role, // Include role in response data
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
};

exports.register = async (req, res) => {
  try {
    console.log("POST /users - Request body:", req.body);
    
    let { password, username, firstName, lastName, email, gender } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).send({
        message: "กรุณาใส่ username, password และ email",
        success: false,
      });
    }

    const existUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existUser) {
      return res.status(400).send({
        message: "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้ไปแล้ว",
        success: false,
      });
    }

    const saltRounds = 10;
    let hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({
      username,
      password: hashedPassword,
      firstName: firstName || "",
      lastName: lastName || "",
      email,
      gender: gender || "",
    });

    const user = await newUser.save();
    console.log("User created successfully:", user._id);

    return res.status(201).send({
      data: { 
        _id: user._id, 
        username: user.username, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email, 
        gender: user.gender,
        createdAt: user.createdAt
      },
      message: "สร้างผู้ใช้สำเร็จ",
      success: true,
    });

  } catch (error) {
    console.error("POST users error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).send({
        message: "ข้อมูลไม่ถูกต้อง: " + error.message,
        success: false,
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).send({
        message: "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้ไปแล้ว",
        success: false,
      });
    }

    return res.status(500).send({
      message: "สร้างผู้ใช้ไม่สำเร็จ",
      success: false,
    });
  }
};