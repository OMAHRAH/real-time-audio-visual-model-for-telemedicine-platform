import express from "express";
import {
  getAdminDashboard,
  getAdminPatientProfile,
  routePatientToDoctor,
} from "../controllers/adminController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/dashboard", protect, authorize("admin"), getAdminDashboard);
router.get("/patients/:id", protect, authorize("admin"), getAdminPatientProfile);
router.post("/route-patient", protect, authorize("admin"), routePatientToDoctor);

export default router;
