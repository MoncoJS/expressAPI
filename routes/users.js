var express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Users = require("../models/์user.js");
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
    let { password, username, firstName, lastName, email } = req.body;
    let hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Users({
      username,
      password: hashedPassword,
      firstName,
      lastName,
      email,
    });
    const user = await newUser.save();
    return res.status(200).send({
      data: { _id: user._id, username, firstName, lastName, email },
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

router.put("/", function (req, res, next) {
  res.send("method put");
});

router.delete("/", function (req, res, next) {
  res.send("method delete");
});

module.exports = router;
