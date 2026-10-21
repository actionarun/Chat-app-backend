require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
let origin = (process.env.CLIENT_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
if (!/^https?:\/\//.test(origin)) origin = "https://" + origin;
app.use(cors({ origin }));
app.use(express.json());

app.get("/", (_, res) => res.send("Chat API running"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/messages", require("./routes/messages"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin } });
require("./socket/socket")(io);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => server.listen(process.env.PORT || 5000, () => console.log("Server running")))
  .catch((e) => console.error("MongoDB error:", e.message));
