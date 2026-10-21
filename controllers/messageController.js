const Message = require("../models/Message");
exports.getMessages = async (req, res) => {
  const me = req.userId, other = req.params.userId;
  const msgs = await Message.find({
    $or: [{ senderId: me, receiverId: other }, { senderId: other, receiverId: me }],
  }).sort({ createdAt: 1 });
  res.json(msgs);
};
