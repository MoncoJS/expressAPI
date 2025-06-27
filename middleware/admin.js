const admin = (req, res, next) => {
  // Assuming req.user is populated by a previous authentication middleware (e.g., verifyToken)
  // And req.user contains a 'role' field
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Admin privilege required.' });
  }
};

module.exports = admin;