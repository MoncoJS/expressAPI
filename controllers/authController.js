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
    console.log("POST /auth/register - Request body:", req.body);
    
    let { password, username, firstName, lastName, email, gender } = req.body;
    
    // Validate required fields
    if (!username || !password || !email || !firstName || !lastName) {
      console.log("Missing required fields:", { username: !!username, password: !!password, email: !!email, firstName: !!firstName, lastName: !!lastName });
      return res.status(400).json({
        message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, นามสกุล, ชื่อผู้ใช้, อีเมล, รหัสผ่าน)",
        success: false,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "รูปแบบอีเมลไม่ถูกต้อง",
        success: false,
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
        success: false,
      });
    }

    // Trim whitespace
    username = username.trim();
    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.trim();

    const existUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existUser) {
      let message = "ข้อมูลนี้ถูกใช้ไปแล้ว: ";
      if (existUser.username === username) {
        message += "ชื่อผู้ใช้";
      }
      if (existUser.email === email) {
        message += (existUser.username === username ? " และอีเมล" : "อีเมล");
      }
      
      return res.status(400).json({
        message,
        success: false,
      });
    }

    const saltRounds = 10;
    let hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({
      username,
      password: hashedPassword,
      firstName,
      lastName,
      email,
      gender: gender || "",
    });

    const user = await newUser.save();
    console.log("User created successfully:", user._id);

    return res.status(201).json({
      data: { 
        _id: user._id, 
        username: user.username, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email, 
        gender: user.gender,
        role: user.role,
        createdAt: user.createdAt
      },
      message: "สร้างผู้ใช้สำเร็จ",
      success: true,
    });

  } catch (error) {
    console.error("POST auth/register error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "ข้อมูลไม่ถูกต้อง: " + error.message,
        success: false,
      });
    }
    
    if (error.code === 11000) {
      // Handle duplicate key error
      let field = 'ข้อมูล';
      if (error.keyPattern?.username) field = 'ชื่อผู้ใช้';
      else if (error.keyPattern?.email) field = 'อีเมล';
      
      return res.status(400).json({
        message: `${field}นี้ถูกใช้ไปแล้ว`,
        success: false,
      });
    }

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง",
      success: false,
    });
  }
};