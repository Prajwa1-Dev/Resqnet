// server.js

// -----------------------------
// 🌐 Core Dependencies
// -----------------------------
const http = require("http");
const { Server } = require("socket.io");
const { app, sessionMiddleware } = require("./app");
const notifier = require("./utils/notifier");
require("dotenv").config();

// -----------------------------
// ⚙️ Create HTTP + Socket.IO Server
// -----------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Attach socket.io to the app
app.set("io", io);

// -----------------------------
// 🧠 Socket Middleware for Sessions
// -----------------------------
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// -----------------------------
// 🔔 Initialize Notifier
// -----------------------------
notifier.init(io);

// -----------------------------
// ⚡ SOCKET CONNECTION HANDLER
// -----------------------------
io.on("connection", (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);

  // ---------------------------------
  // 🏠 JOINING ROOMS
  // ---------------------------------
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`🏠 ${socket.id} joined room: ${roomId}`);
  });

  // ---------------------------------
  // 🔌 DISCONNECT
  // ---------------------------------
  socket.on("disconnect", () => {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });
});

// -----------------------------
// 🚀 Start the Server
// -----------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚑 ResQNet server running at http://localhost:${PORT}`);
});
