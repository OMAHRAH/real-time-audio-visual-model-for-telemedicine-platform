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
import patientRoutes from "./routes/patientRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import schedulingRoutes from "./routes/schedulingRoutes.js";

dotenv.config();
connectDB();

const app = express();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const LOCAL_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes("*")) {
    return true;
  }

  return LOCAL_ORIGIN_PATTERN.test(origin) || allowedOrigins.includes(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by Socket.IO CORS"));
    },
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("notifications:join-user", ({ userId }) => {
    if (!userId) {
      return;
    }

    socket.join(`user:${userId}`);
  });

  socket.on("notifications:leave-user", ({ userId }) => {
    if (!userId) {
      return;
    }

    socket.leave(`user:${userId}`);
  });

  socket.on("chat:join-room", ({ roomId }) => {
    if (!roomId) {
      return;
    }

    socket.join(roomId);
  });

  socket.on("chat:leave-room", ({ roomId }) => {
    if (!roomId) {
      return;
    }

    socket.leave(roomId);
  });

  [
    "call:invite",
    "call:accept",
    "call:decline",
    "call:offer",
    "call:answer",
    "call:ice-candidate",
    "call:end",
  ].forEach((eventName) => {
    socket.on(eventName, (payload) => {
      if (!payload?.roomId) {
        return;
      }

      socket.to(payload.roomId).emit(eventName, payload);
    });
  });
});

app.set("io", io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());
app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api/vitals", vitalRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/scheduling", schedulingRoutes);
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
