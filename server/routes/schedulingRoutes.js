import express from "express";
import {
  cancelAvailabilitySlot,
  createAvailabilitySlot,
  getDoctorSlots,
  getMySchedule,
  rescheduleAppointment,
} from "../controllers/schedulingController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/doctors/:doctorId/slots", protect, getDoctorSlots);
router.get("/me/slots", protect, authorize("doctor"), getMySchedule);
router.post("/slots", protect, authorize("doctor"), createAvailabilitySlot);
router.delete("/slots/:id", protect, authorize("doctor"), cancelAvailabilitySlot);
router.patch("/appointments/:id/reschedule", protect, rescheduleAppointment);

export default router;
