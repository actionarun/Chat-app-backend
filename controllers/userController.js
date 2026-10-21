const users = await User.find({ _id: { $ne: req.userId }, verified: { $ne: false }, name: { $regex: q, $options: "i" } })
exports.searchUsers = async (req, res) => {
  const q = (req.query.q || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const users = await User.find({ _id: { $ne: req.userId }, name: { $regex: q, $options: "i" } })
    .select("name email").sort({ name: 1 }).limit(50);
  res.json(users);
};
