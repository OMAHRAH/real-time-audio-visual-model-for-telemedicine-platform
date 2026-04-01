import express from "express";
import { sendMessage, getConversation } from "../controllers/chatController.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/send", sendMessage);
router.get("/:patientId", getConversation);
router.post("/send", upload.single("file"), sendMessage);

export default router;
