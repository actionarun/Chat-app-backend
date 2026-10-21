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

    // SEND
    socket.on("send-message", async ({ receiverId, message, image }, ack) => {
      const text = (message || "").trim();
      const img = image || "";
      if (!receiverId || (!text && !img)) return;
      if (img && (!img.startsWith("data:image/") || img.length > 3_000_000)) {
        return typeof ack === "function" && ack({ error: "Image is too large. Try a smaller photo." });
      }
      const saved = await Message.create({ senderId: id, receiverId, message: text, image: img });
      io.to(receiverId).emit("receive-message", saved);
      socket.to(id).emit("receive-message", saved);
      if (typeof ack === "function") ack(saved);
    });

    // EDIT (only your own messages)
    socket.on("edit-message", async ({ messageId, message }, ack) => {
      const reply = (r) => typeof ack === "function" && ack(r);
      try {
        const text = (message || "").trim();
        if (text.length > 2000) return reply({ error: "Message is too long." });
        const m = await Message.findById(messageId);
        if (!m || m.senderId !== id) return reply({ error: "You can only edit your own messages." });
        if (m.deleted) return reply({ error: "This message was deleted." });
        if (!text && !m.image) return reply({ error: "Message can't be empty." });
        m.message = text;
        m.edited = true;
        await m.save();
        io.to(m.receiverId).to(id).emit("message-updated", m);
        reply(m);
      } catch { reply({ error: "Could not edit the message." }); }
    });

    // DELETE for everyone (only your own messages)
    socket.on("delete-message", async ({ messageId }, ack) => {
      const reply = (r) => typeof ack === "function" && ack(r);
      try {
        const m = await Message.findById(messageId);
        if (!m || m.senderId !== id) return reply({ error: "You can only delete your own messages." });
        m.deleted = true;
        m.message = "";
        m.image = "";
        await m.save();
        io.to(m.receiverId).to(id).emit("message-updated", m);
        reply(m);
      } catch { reply({ error: "Could not delete the message." }); }
    });

    socket.on("disconnect", () => {
      const set = online.get(id);
      if (set) { set.delete(socket.id); if (!set.size) online.delete(id); }
      io.emit("online-users", [...online.keys()]);
    });
  });
};