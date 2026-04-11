import express from "express";
import {
  getIceServers,
  createCallLog,
} from "../controllers/callController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/ice-servers", protect, getIceServers);
router.post("/log", protect, createCallLog);

export default router;
