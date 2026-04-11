import express from "express";
import { authorize, protect } from "../middlewares/authMiddleware.js";
import {
  createVitalReading,
  getLatestVitals,
  getCriticalAlerts,
  reviewVital,
  getVitalsByPatient,
} from "../controllers/vitalController.js";

const router = express.Router();

router.post("/", protect, createVitalReading);
router.get("/latest", protect, authorize("doctor", "admin"), getLatestVitals);
router.get("/alerts", protect, getCriticalAlerts);
router.patch("/review/:id", protect, reviewVital);
router.get(
  "/patient/:id",
  protect,
  authorize("patient", "doctor", "admin"),
  getVitalsByPatient,
);

export default router;
