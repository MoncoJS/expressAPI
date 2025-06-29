const express = require("express");
const mongoose = require("mongoose"); // Add this line back
const bcrypt = require("bcrypt");
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

// PUT /users/:id/role - เปลี่ยนสิทธิ์ผู้ใช้ (ต้อง verifyToken และเป็น admin)
router.put("/:id/role", verifyToken, async function (req, res) {
  try {
    const id = req.params.id;
    const { role } = req.body;
    
    // Check if current user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).send({
        message: "ไม่มีสิทธิ์ในการเปลี่ยนสิทธิ์ผู้ใช้",
        success: false,
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid user ID",
        success: false,
      });
    }
    
    // Validate role
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).send({
        message: "สิทธิ์ไม่ถูกต้อง ต้องเป็น 'user' หรือ 'admin'",
        success: false,
      });
    }
    
    // Prevent admin from changing their own role
    if (req.user._id === id) {
      return res.status(400).send({
        message: "ไม่สามารถเปลี่ยนสิทธิ์ของตนเองได้",
        success: false,
      });
    }

    const updatedUser = await Users.findByIdAndUpdate(
      id, 
      { role }, 
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).send({
        message: "ไม่พบผู้ใช้",
        success: false,
      });
    }

    return res.status(200).send({
      data: updatedUser,
      message: "เปลี่ยนสิทธิ์สำเร็จ",
      success: true,
    });
  } catch (error) {
    console.error("PUT users role error:", error);
    return res.status(500).send({
      message: "เปลี่ยนสิทธิ์ไม่สำเร็จ",
      success: false,
    });
  }
});

// PUT /users/:id/password - เปลี่ยนรหัสผ่าน (ต้อง verifyToken)
router.put("/:id/password", verifyToken, async function (req, res) {
  try {
    const id = req.params.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid user ID",
        success: false,
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).send({
        message: "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่",
        success: false,
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).send({
        message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร",
        success: false,
      });
    }

    // Find the user with password included
    const user = await Users.findById(id);
    if (!user) {
      return res.status(404).send({
        message: "ไม่พบผู้ใช้",
        success: false,
      });
    }

    // Check if current password is correct
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).send({
        message: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
        success: false,
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updatedUser = await Users.findByIdAndUpdate(
      id, 
      { password: hashedNewPassword }, 
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).send({
        message: "ไม่พบผู้ใช้",
        success: false,
      });
    }

    return res.status(200).send({
      data: updatedUser,
      message: "เปลี่ยนรหัสผ่านสำเร็จ",
      success: true,
    });
  } catch (error) {
    console.error("PUT users password error:", error);
    return res.status(500).send({
      message: "เปลี่ยนรหัสผ่านไม่สำเร็จ",
      success: false,
    });
  }
});

module.exports = router;