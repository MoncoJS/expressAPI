const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Users = require("../models/user.js");
const verifyToken = require("../middleware/jwt_decode");
const router = express.Router();

// POST /users - สร้างผู้ใช้ใหม่ (ไม่ต้อง verifyToken)
router.post("/", async function (req, res) {
  try {
    console.log("POST /users - Request body:", req.body);
    
    let { password, username, firstName, lastName, email, gender } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).send({
        message: "กรุณาใส่ username, password และ email",
        success: false,
      });
    }

    const existUser = await Users.findOne({ 
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

    const newUser = new Users({
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
});

// GET /users - ดูข้อมูลผู้ใช้ (ต้อง verifyToken)
router.get("/", verifyToken, async function (req, res, next) {
  try {
    const users = await Users.find();
    return res.status(200).send({
      data: users,
      message: "success",
      success: true,
    });
  } catch (error) {
    console.error("GET users error:", error);
    return res.status(500).send({
      message: "fail",
      success: false,
    });
  }
});

// GET /users/:id - ดูข้อมูลผู้ใช้ตาม id (ต้อง verifyToken)
router.get("/:id", verifyToken, async function (req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid user ID",
        success: false,
      });
    }
    const user = await Users.findById(id).select("-password");
    if (!user) {
      return res.status(404).send({
        message: "ไม่พบผู้ใช้",
        success: false,
      });
    }
    return res.status(200).send({
      data: user,
      message: "success",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "fail",
      success: false,
    });
  }
});

// PUT /users/:id - แก้ไขข้อมูลผู้ใช้ (ต้อง verifyToken)
router.put("/:id", verifyToken, async function (req, res) {
  try {
    const id = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid user ID",
        success: false,
      });
    }

    // Find the user first to compare current username/email
    const currentUser = await Users.findById(id);
    if (!currentUser) {
      return res.status(404).send({
        message: "ไม่พบผู้ใช้",
        success: false,
      });
    }

    // Check for duplicate username or email if they are being updated
    if (req.body.username && req.body.username !== currentUser.username) {
      const existingUserWithUsername = await Users.findOne({ username: req.body.username });
      if (existingUserWithUsername) {
        return res.status(400).send({
          message: "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว",
          success: false,
        });
      }
    }

    if (req.body.email && req.body.email !== currentUser.email) {
      const existingUserWithEmail = await Users.findOne({ email: req.body.email });
      if (existingUserWithEmail) {
        return res.status(400).send({
          message: "อีเมลนี้ถูกใช้ไปแล้ว",
          success: false,
        });
      }
    }

    if (req.body.password) {
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    const updatedUser = await Users.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!updatedUser) {
      return res.status(404).send({
        message: "ไม่พบผู้ใช้",
        success: false,
      });
    }

    const { password, ...userWithoutPassword } = updatedUser.toObject();

    return res.status(200).send({
      data: userWithoutPassword,
      message: "อัพเดทสำเร็จ",
      success: true,
    });
  } catch (error) {
    console.error("PUT users error:", error);
    return res.status(500).send({
      message: "อัพเดทไม่สำเร็จ",
      success: false,
    });
  }
});

// DELETE /users/:id - ลบผู้ใช้ (ต้อง verifyToken)
router.delete("/:id", verifyToken, async function (req, res) {
  try {
    const id = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid user ID",
        success: false,
      });
    }

    const deletedUser = await Users.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).send({
        message: "ไม่พบผู้ใช้",
        success: false,
      });
    }

    return res.status(200).send({
      message: "ลบสำเร็จ",
      success: true,
    });
  } catch (error) {
    console.error("DELETE users error:", error);
    return res.status(500).send({
      message: "ลบไม่สำเร็จ",
      success: false,
    });
  }
});

module.exports = router;