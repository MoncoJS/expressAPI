var express = require("express");
const productModel = require("../models/product");
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
router.post("/", async function (req, res) {
  try {
    const { product_name, price, amount } = req.body;
    let newProduct = new productModel({
      product_name: product_name,
      price: price,
      amount: amount,
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
router.put("/", function (req, res) {
  res.send("method put");
});
router.delete("/", function (req, res) {
  res.send("method delete");
});

module.exports = router;
