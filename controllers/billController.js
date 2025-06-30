const Bill = require('../models/bill');
const Product = require('../models/product');

// Get all bills (Admin only)
exports.getAllBills = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    // Build filter
    let filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.billDate = {};
      if (startDate) filter.billDate.$gte = new Date(startDate);
      if (endDate) filter.billDate.$lte = new Date(endDate);
    }

    const bills = await Bill.find(filter)
      .populate('userId', 'username email firstName lastName')
      .populate('couponApplied', 'code discountValue discountType')
      .sort({ billDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Bill.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Bills retrieved successfully',
      data: bills,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all bills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bills',
      error: error.message
    });
  }
};

// Get user's bills (User)
exports.getMyBills = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;

    // Build filter
    let filter = { userId };
    if (status) filter.status = status;

    const bills = await Bill.find(filter)
      .populate('couponApplied', 'code discountValue discountType')
      .sort({ billDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Bill.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'My bills retrieved successfully',
      data: bills,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching my bills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bills',
      error: error.message
    });
  }
};

// Get bill by ID
exports.getBillById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const bill = await Bill.findById(id)
      .populate('userId', 'username email firstName lastName')
      .populate('couponApplied', 'code discountValue discountType');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bill retrieved successfully',
      data: bill
    });
  } catch (error) {
    console.error('Error fetching bill by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill',
      error: error.message
    });
  }
};

// Get user's bill by ID
exports.getMyBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const bill = await Bill.findOne({ _id: id, userId })
      .populate('items.product', 'product_name img Product_price')
      .populate('couponApplied', 'code discountValue discountType');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bill retrieved successfully',
      data: bill
    });
  } catch (error) {
    console.error('Error fetching my bill by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill',
      error: error.message
    });
  }
};

// Update bill status (Admin only)
exports.updateBillStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updatedBill = await Bill.findByIdAndUpdate(
      id,
      { status, ...(notes && { notes }) },
      { new: true }
    ).populate('userId', 'username email');

    if (!updatedBill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bill status updated successfully',
      data: updatedBill
    });
  } catch (error) {
    console.error('Error updating bill status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bill status',
      error: error.message
    });
  }
};

// Create bill (called from checkout)
exports.createBill = async (billData) => {
  try {
    const bill = new Bill(billData);
    await bill.save();
    return bill;
  } catch (error) {
    console.error('Error creating bill:', error);
    throw error;
  }
};
