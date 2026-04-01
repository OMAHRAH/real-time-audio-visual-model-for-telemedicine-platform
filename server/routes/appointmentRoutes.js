import express from "express";
import {
  createAppointment,
  getAppointments,
  getPatientAppointments,
  updateAppointmentStatus,
  addDoctorNotes,
} from "../controllers/appointmentController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createAppointment);
router.get("/", protect, getAppointments);
router.get("/patient/:id", getPatientAppointments);
router.patch("/:id", protect, updateAppointmentStatus);
router.patch("/:id/status", protect, updateAppointmentStatus);
router.patch("/:id/notes", addDoctorNotes);

export default router;
