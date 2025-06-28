const express = require("express");
const mongoose = require("mongoose"); // Add this line back
const Users = require("../models/user.js");
const verifyToken = require("../middleware/jwt_decode");
const router = express.Router();



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