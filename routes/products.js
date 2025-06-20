var express = require("express");
const mongoose = require("mongoose");
const productModel = require("../models/product");
const upload = require("../middleware/image");
var router = express.Router();

/* GET users listing. */
router.get("/", async function (req, res) {
  //   res.send('method get');
  try {
    let products = await productModel.find();
    return res.status(200).send({
      data: products,
      message: "Products retrieved successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error retrieving products",
      success: false,
    });
  }
});

router.get("/:id", async function (req, res) {
  try {
    let id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid product ID",
        success: false,
        error: "Invalid ID format",
      });
    }
    let product = await productModel.findById(id);
    return res.status(200).send({
      data: product,
      message: "Product retrieved successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error retrieving product",
      success: false,
      error: error.message,
    });
  }
});

router.post("/", upload.single("image"), async function (req, res) {
  let nameImage = "";
  if (req.file) {
    nameImage = req.file.filename;
  }

  try {
    const { product_name, price, amount, description } = req.body;
    let newProduct = new productModel({
      product_name: product_name,
      price: price,
      amount: amount,
      img: nameImage,
      description: description,
    });
    let savedProduct = await newProduct.save();
    return res.status(201).send({
      data: savedProduct,
      message: "Product created successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error creating product",
      success: false,
    });
  }
});
router.put("/:id", async function (req, res) {
  //   res.send("method put");
  try {
    const { id, product_name, price, amount, description } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid product ID",
        success: false,
        error: "Invalid ID format",
      });
    }
    await productModel.updateOne(
      { _id: mongoose.Types.ObjectId(id) },
      { set: req.body }
    );
    let product = await productModel.findById(id);
    return res.status(201).send({
      data: product,
      message: "Product updated successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error updating product",
      success: false,
      error: error.message,
    });
  }
});

router.delete("/:id", async function (req, res) {
  //   res.send("method delete");
  try {
    let id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid product ID",
        success: false,
        error: "Invalid ID format",
      });
    }
    await productModel.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    let products = await productModel.find();
    return res.status(200).send({
      data: products,
      message: "Product deleted successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Error deleting product",
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
