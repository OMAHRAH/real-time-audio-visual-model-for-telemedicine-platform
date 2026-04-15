import express from "express";
import {
  createAppointment,
  getAppointments,
  getPatientAppointments,
  updateAppointmentStatus,
  addDoctorNotes,
  updateConsultationRecord,
} from "../controllers/appointmentController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createAppointment);
router.get("/", protect, getAppointments);
router.get(
  "/patient/:id",
  protect,
  authorize("patient", "doctor", "admin"),
  getPatientAppointments,
);
router.patch("/:id", protect, updateAppointmentStatus);
router.patch("/:id/status", protect, updateAppointmentStatus);
router.patch("/:id/notes", protect, authorize("doctor"), addDoctorNotes);
router.patch(
  "/:id/consultation-record",
  protect,
  authorize("doctor"),
  updateConsultationRecord,
);

export default router;
