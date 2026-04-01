console.log("📦 vitalRoutes.js loaded");
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createVitalReading,
  getLatestVitals,
  getCriticalAlerts,
  reviewVital,
} from "../controllers/vitalController.js";
import { getVitalsByPatient } from "../controllers/vitalController.js";

const router = express.Router();

router.post("/", protect, createVitalReading);
router.get("/latest", getLatestVitals);
router.get("/alerts", protect, getCriticalAlerts);
router.patch("/review/:id", protect, reviewVital);
router.get("/patient/:id", getVitalsByPatient);

export default router;
