const jwt = require("jsonwebtoken");
const Message = require("../models/Message");

const online = new Map(); // userId -> Set(socketId)

module.exports = (io) => {
  io.use((socket, next) => {
    try { socket.userId = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET).id; next(); }
    catch { next(new Error("Unauthorized")); }
  });

  io.on("connection", (socket) => {
    const id = socket.userId;
    if (!online.has(id)) online.set(id, new Set());
    online.get(id).add(socket.id);
    socket.join(id); // private room per user
    io.emit("online-users", [...online.keys()]);

    socket.on("send-message", async ({ receiverId, message }, ack) => {
      if (!receiverId || !message || !message.trim()) return;
      const saved = await Message.create({ senderId: id, receiverId, message: message.trim() });
      io.to(receiverId).emit("receive-message", saved);   // to receiver
      socket.to(id).emit("receive-message", saved);       // sender's other tabs
      if (typeof ack === "function") ack(saved);
    });

    socket.on("disconnect", () => {
      const set = online.get(id);
      if (set) { set.delete(socket.id); if (!set.size) online.delete(id); }
      io.emit("online-users", [...online.keys()]);
    });
  });
};
