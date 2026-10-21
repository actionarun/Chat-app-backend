const r = require("express").Router();
r.get("/", require("../middleware/auth"), require("../controllers/userController").searchUsers);
module.exports = r;
