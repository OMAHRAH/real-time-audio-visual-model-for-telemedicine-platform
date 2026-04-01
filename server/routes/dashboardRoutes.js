import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getDoctorDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", protect, getDoctorDashboard);

export default router;
