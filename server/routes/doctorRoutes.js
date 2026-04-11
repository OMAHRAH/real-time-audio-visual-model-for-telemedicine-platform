import express from "express";
import {
  getDoctors,
  updateAvailability,
} from "../controllers/doctorController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getDoctors);
router.patch(
  "/availability",
  protect,
  authorize("doctor"),
  updateAvailability,
);

export default router;
