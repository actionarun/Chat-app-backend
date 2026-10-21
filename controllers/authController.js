const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const pub = (u) => ({ _id: u._id, name: u.name, email: u.email });
const hash = (otp) => crypto.createHash("sha256").update(otp + process.env.JWT_SECRET).digest("hex");

async function issueOtp(user) {
  const otp = String(crypto.randomInt(100000, 1000000));
  user.otpHash = hash(otp);
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.otpTries = 0;
  await user.save();
  await sendEmail({
    to: user.email,
    name: user.name,
    subject: "Your ChatApp verification code",
    html: `<div style="font-family:sans-serif">
      <p>Hi ${user.name},</p>
      <p>Your ChatApp verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>
      <p>It expires in 10 minutes. If you did not sign up, ignore this email.</p></div>`,
  });
}

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ error: "Fill all fields. Password needs 6+ characters." });
    const mail = email.toLowerCase().trim();
    let user = await User.findOne({ email: mail });
    if (user && user.verified) return res.status(400).json({ error: "This email is already registered" });
    const hashed = await bcrypt.hash(password, 10);
    if (user) { user.name = name; user.password = hashed; }
    else user = new User({ name, email: mail, password: hashed, verified: false });
    await issueOtp(user);
    res.json({ needsVerify: true, email: user.email });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.verify = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) return res.status(400).json({ error: "Account not found" });
    if (user.verified) return res.status(400).json({ error: "Already verified. Please log in." });
    if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date())
      return res.status(400).json({ error: "Code expired. Request a new one." });
    if (user.otpTries >= 5)
      return res.status(400).json({ error: "Too many wrong attempts. Request a new code." });
    if (hash(String(otp || "").trim()) !== user.otpHash) {
      user.otpTries += 1;
      await user.save();
      return res.status(400).json({ error: "Wrong code. Check your email and try again." });
    }
    user.verified = true;
    user.otpHash = "";
    user.otpExpires = undefined;
    await user.save();
    res.json({ token: sign(user._id), user: pub(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.resend = async (req, res) => {
  try {
    const user = await User.findOne({ email: (req.body.email || "").toLowerCase() });
    if (!user || user.verified) return res.json({ ok: true });
    // allow one new code per minute
    if (user.otpExpires && user.otpExpires.getTime() - Date.now() > 9 * 60 * 1000)
      return res.status(429).json({ error: "Wait a minute before requesting another code." });
    await issueOtp(user);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.password)))
      return res.status(400).json({ error: "Wrong email or password" });
    if (user.verified === false) {
      await issueOtp(user);
      return res.status(403).json({ needsVerify: true, email: user.email, error: "Please verify your email. We sent you a new code." });
    }
    res.json({ token: sign(user._id), user: pub(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.me = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: "User not found" });
  res.json({ user: pub(user) });
};