import express from "express";
import {
  sendMessage,
  getConversation,
  getUnreadSummary,
  markConversationAsRead,
} from "../controllers/chatController.js";
import upload from "../middlewares/upload.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();
const handleChatUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next();
  });
};

router.get("/unread/summary", protect, getUnreadSummary);
router.patch("/read", protect, markConversationAsRead);
router.get("/:patientId", protect, getConversation);
router.post("/send", protect, handleChatUpload, sendMessage);

export default router;
