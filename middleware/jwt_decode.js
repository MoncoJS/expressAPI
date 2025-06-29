const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) throw new Error("No token provided");
    const token = auth.split("Bearer ")[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Auth failed" });
  }
};
