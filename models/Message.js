const mongoose = require("mongoose");
module.exports = mongoose.model("Message", new mongoose.Schema({
  senderId: { type: String, required: true, index: true },
  receiverId: { type: String, required: true, index: true },
  message: { type: String, default: "" },
  image: { type: String, default: "" },
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}));