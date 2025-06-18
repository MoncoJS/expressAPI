var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('method get');
});
router.post('/', function(req, res, next) {
  res.send('method post');
});
router.put('/', function(req, res, next) {
  res.send('method put');
});
router.delete('/', function(req, res, next) {
  res.send('method delete');
});

module.exports = router;
