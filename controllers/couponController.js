const Coupon = require('../models/coupon');

function generateRandomCode(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Create a new coupon (Admin only)
exports.createCoupon = async (req, res) => {
  try {
    const { name, discountType, discountValue, expirationDate, isActive } = req.body;
    let { code } = req.body;

    if (!code) {
      code = generateRandomCode();
    } else {
      code = code.toUpperCase(); // Ensure code is always uppercase
    }

    const newCoupon = new Coupon({
      name,
      code,
      discountType,
      discountValue,
      expirationDate,
      isActive,
    });

    const savedCoupon = await newCoupon.save();
    res.status(201).json({ success: true, data: savedCoupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all coupons (Admin only)
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({});
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get coupon by code (Public)
exports.getCouponByCode = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase() });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a coupon (Admin only)
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCoupon = await Coupon.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, data: updatedCoupon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a coupon (Admin only)
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCoupon = await Coupon.findByIdAndDelete(id);
    if (!deletedCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
