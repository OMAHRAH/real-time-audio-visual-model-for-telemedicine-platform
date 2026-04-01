import dashboardRoutes from "./routes/dashboardRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import vitalRoutes from "./routes/vitalRoutes.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import { Server } from "socket.io";
import http from "http";
import chatRoutes from "./routes/chatRoutes.js";

dotenv.config();
connectDB();

const app = express();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use("/api/auth", authRoutes);
app.use("/api/vitals", vitalRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/chat", chatRoutes);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("Telemedicine API is running...");
});

app.get("/test-vitals", (req, res) => {
  res.send("Vitals route test working");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
