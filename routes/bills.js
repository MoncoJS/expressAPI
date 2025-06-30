const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt_decode');
const admin = require('../middleware/admin');
const billController = require('../controllers/billController');

// User routes - ดูประวัติการสั่งซื้อของตัวเอง
router.get('/my', verifyToken, billController.getMyBills);
router.get('/my/:id', verifyToken, billController.getMyBillById);

// Admin routes - ดูรายการสั่งซื้อทั้งหมด
router.get('/all', verifyToken, admin, billController.getAllBills);
router.get('/:id', verifyToken, admin, billController.getBillById);

// Update bill status (admin only)
router.put('/:id/status', verifyToken, admin, billController.updateBillStatus);

module.exports = router;
