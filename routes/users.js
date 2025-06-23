var express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Users = require("../models/user.js");
var router = express.Router();

/* GET users listing. */
router.get("/", async function (req, res, next) {
  try {
    const users = await Users.find();
    return res.status(200).send({
      data: users,
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

router.post("/", async function (req, res) {
  try {
    let { password, username, firstName, lastName, email, gender } = req.body;
    let hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Users({
      username,
      password: hashedPassword,
      firstName,
      lastName,
      email,
      gender,
    });
    const user = await newUser.save();
    return res.status(200).send({
      data: { _id: user._id, username, firstName, lastName, email, gender },
      message: "create success",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "create fail",
      success: false,
    });
  }
});

router.put("/:id", async function (req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid user ID",
        success: false,
      });
    }
    const updatedUser = await Users.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    return res.status(200).send({
      data: updatedUser,
      message: "update success",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "update fail",
      success: false,
    });
  }
});

router.delete("/:id", async function (req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid user ID",
        success: false,
      });
    }
    await Users.findByIdAndDelete(id);
    return res.status(200).send({
      message: "delete success",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "delete fail",
      success: false,
    });
  }
});

module.exports = router;
