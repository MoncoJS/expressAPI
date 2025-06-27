const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split("Bearer ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded; // Store decoded token in req.user
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Auth failed",
    });
  }
};
