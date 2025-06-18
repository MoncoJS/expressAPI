var express = require('express');
const productModel = require('../models/product');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
  res.send('method get');
});
router.post('/', async function(req, res) {
    try {
        const { product_name, price, amount } = req.body;
        let newProduct = new productModel({
            product_name: product_name,
            price: price,
            amount: amount
        });
        let savedProduct = await newProduct.save();
        return res.status(201).send({
            data: savedProduct,
            message: 'Product created successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).send({
            message: 'Error creating product',
            success: false,
        });
    }
});
router.put('/', function(req, res) {
  res.send('method put');
});
router.delete('/', function(req, res) {
  res.send('method delete');
});

module.exports = router;
