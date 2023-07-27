const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(401).json({
      message: "No token located at x-auth-token header, authorization denied",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.myjwtsecret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({
      message: "Token could not be verified",
    });
  }
}

module.exports = auth;
