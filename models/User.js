const mongoose = require("mongoose");
module.exports = mongoose.model("User", new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  verified: { type: Boolean, default: true }, // old users stay verified
  otpHash: { type: String, default: "" },
  otpExpires: { type: Date },
  otpTries: { type: Number, default: 0 },
}, { timestamps: true }));