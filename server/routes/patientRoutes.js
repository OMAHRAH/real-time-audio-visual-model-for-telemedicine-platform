import express from "express";
import {
  getPatientById,
  getPatients,
} from "../controllers/patientController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("doctor", "admin"), getPatients);
router.get("/:id", protect, authorize("doctor", "admin"), getPatientById);

export default router;
