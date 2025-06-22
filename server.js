// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const songRoutes = require("./routes/songRoutes");
const userRoutes = require("./routes/userRoutes");
const spotifyRoutes = require("./routes/spotifyRoutes");
const artistRoutes = require("./routes/artistRoutes");
const FRONTEND_URI = process.env.FRONTEND_URL;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (Change it in production)
  },
});

// Middleware
app.use(
  cors({
    origin: FRONTEND_URI, // Change this to your frontend URL
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    // credentials: true, // Allow cookies, authorization headers, etc.
  })
);

app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once("open", () => console.log("MongoDB connected successfully"));
db.on("error", (err) => console.log("MongoDB connection error:", err));

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Import other routes
app.use("/api/songs", songRoutes);
app.use("/api/users", userRoutes);
app.use("/api/spotify", spotifyRoutes);
app.use("/api/artists", artistRoutes);

// Health check route
app.get("/health", async (req, res) => {
  console.log("Health check");
  const mongoStatus = db.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    status: "ok",
    mongo: mongoStatus,
    timestamp: new Date().toISOString(),
  });
});

// Socket.io
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
