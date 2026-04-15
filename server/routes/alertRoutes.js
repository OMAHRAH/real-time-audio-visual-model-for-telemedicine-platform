import express from "express";
import {
  createEmergencyAlert,
  getActiveEmergencyAlert,
  getAlerts,
  resolveEmergencyAlert,
} from "../controllers/alertController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAlerts);
router.get("/emergency/active", protect, getActiveEmergencyAlert);
router.post("/emergency", protect, createEmergencyAlert);
router.patch("/:id/resolve", protect, resolveEmergencyAlert);

export default router;
