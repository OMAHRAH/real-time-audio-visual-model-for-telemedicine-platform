import express from "express";
import {
  createEmergencyAlert,
  getAlerts,
} from "../controllers/alertController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAlerts);
router.post("/emergency", protect, createEmergencyAlert);

export default router;
