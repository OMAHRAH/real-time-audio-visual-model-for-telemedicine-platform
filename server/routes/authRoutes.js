import express from "express";
import { register, login } from "../controllers/authController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router(); // 👈 THIS MUST COME BEFORE USING router

router.post("/register", register);
router.post("/login", login);
router.get("/doctor-only", protect, authorize("doctor"), (req, res) => {
  res.json({
    message: "Welcome Doctor",
  });
});

router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Profile accessed successfully",
    user: req.user,
  });
});

export default router;
