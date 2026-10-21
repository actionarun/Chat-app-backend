const r = require("express").Router();
r.get("/:userId", require("../middleware/auth"), require("../controllers/messageController").getMessages);
module.exports = r;
