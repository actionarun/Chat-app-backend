const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
  const token = (req.headers.authorization || "").split(" ")[1];
  try { req.userId = jwt.verify(token, process.env.JWT_SECRET).id; next(); }
  catch { res.status(401).json({ error: "Please log in again" }); }
};
