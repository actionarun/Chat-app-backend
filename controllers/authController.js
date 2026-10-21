const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const pub = (u) => ({ _id: u._id, name: u.name, email: u.email });

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ error: "Fill all fields. Password needs 6+ characters." });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ error: "This email is already registered" });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.json({ token: sign(user._id), user: pub(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.password)))
      return res.status(400).json({ error: "Wrong email or password" });
    res.json({ token: sign(user._id), user: pub(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.me = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: "User not found" });
  res.json({ user: pub(user) });
};
