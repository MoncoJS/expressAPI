const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const verifyToken = require('../middleware/jwt_decode');

// Admin routes
router.post('/', verifyToken, couponController.createCoupon);
router.get('/', verifyToken, couponController.getAllCoupons);
router.put('/:id', verifyToken, couponController.updateCoupon);
router.delete('/:id', verifyToken, couponController.deleteCoupon);

// Public route to get coupon by code
router.get('/code/:code', couponController.getCouponByCode);

module.exports = router;
