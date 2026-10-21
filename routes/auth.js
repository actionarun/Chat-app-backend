const r = require("express").Router();
const c = require("../controllers/authController");
r.post("/signup", c.signup);
r.post("/login", c.login);
r.get("/me", require("../middleware/auth"), c.me);
module.exports = r;
