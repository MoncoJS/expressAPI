const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const verifyToken = require('../middleware/jwt_decode');
const admin = require('../middleware/admin'); // Import admin middleware

// Admin routes
router.post('/', verifyToken, admin, couponController.createCoupon);
router.get('/', verifyToken, admin, couponController.getAllCoupons);
router.put('/:id', verifyToken, admin, couponController.updateCoupon);
router.delete('/:id', verifyToken, admin, couponController.deleteCoupon);

// Public route to get coupon by code
router.get('/code/:code', couponController.getCouponByCode);

module.exports = router;
