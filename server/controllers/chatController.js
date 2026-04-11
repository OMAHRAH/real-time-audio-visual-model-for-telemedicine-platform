import ChatMessage from "../models/chatMessage.js";
import User from "../models/user.js";
import mongoose from "mongoose";

const getUnreadFilter = () => ({
  $or: [{ readAt: null }, { readAt: { $exists: false } }],
});

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { patient, receiver, message } = req.body;
    let patientId = patient;
    let senderId = req.body.sender;
    let receiverId = receiver;
    const hasFile = Boolean(req.file);
    const trimmedMessage = message?.trim() || "";

    if (!trimmedMessage && !hasFile) {
      return res.status(400).json({
        message: "Provide a message or upload a file",
      });
    }

    if (req.user?.role === "patient") {
      patientId = req.user.id;
      senderId = req.user.id;

      const doctor = await User.findOne({
        _id: receiver,
        role: "doctor",
      });

      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }

      if (doctor.isOnline === false) {
        return res.status(403).json({
          message: "Doctor is offline and unavailable for chat",
        });
      }
    }

    if (req.user?.role === "doctor") {
      patientId = patient;
      senderId = req.user.id;
      receiverId = patient;
    }

    const chat = await ChatMessage.create({
      patient: patientId,
      sender: senderId,
      receiver: receiverId,
      message: trimmedMessage,
      type: hasFile
        ? req.file.mimetype.startsWith("image/")
          ? "image"
          : req.file.mimetype.startsWith("audio/")
            ? "audio"
          : "file"
        : "text",
      fileUrl: hasFile ? `/uploads/${req.file.filename}` : undefined,
      fileName: hasFile ? req.file.originalname : undefined,
      mimeType: hasFile ? req.file.mimetype : undefined,
      fileSize: hasFile ? req.file.size : undefined,
    });

    const populatedChat = await ChatMessage.findById(chat._id)
      .populate("sender", "name role")
      .populate("receiver", "name role");

    if (req.io) {
      req.io.emit("new-message", populatedChat);
    }

    res.status(201).json({
      message: "Message sent",
      chat: populatedChat,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error sending message",
      error: error.message,
    });
  }
};

// Get conversation for a patient
export const getConversation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { doctorId } = req.query;
    const query = { patient: patientId };

    if (doctorId) {
      query.$or = [
        { sender: patientId, receiver: doctorId },
        { sender: doctorId, receiver: patientId },
      ];
    }

    const messages = await ChatMessage.find(query)
      .populate("sender", "name role")
      .populate("receiver", "name role")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching messages",
      error: error.message,
    });
  }
};

export const getUnreadSummary = async (req, res) => {
  try {
    const unreadMatch = {
      receiver: toObjectId(req.user.id),
      ...getUnreadFilter(),
    };
    const isPatient = req.user.role === "patient";
    const isDoctor = req.user.role === "doctor" || req.user.role === "admin";

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ message: "Unsupported user role" });
    }

    const groupField = isPatient ? "$sender" : "$patient";
    const groupedUnreadMessages = await ChatMessage.aggregate([
      {
        $match: unreadMatch,
      },
      {
        $group: {
          _id: groupField,
          unreadCount: { $sum: 1 },
          latestMessageAt: { $max: "$createdAt" },
        },
      },
      {
        $sort: {
          latestMessageAt: -1,
        },
      },
    ]);

    const userIds = groupedUnreadMessages.map((item) => item._id).filter(Boolean);
    const users = await User.find({
      _id: { $in: userIds },
      role: isPatient ? "doctor" : "patient",
    })
      .select(isPatient ? "name email specialty isOnline" : "name email")
      .lean();

    const usersById = new Map(
      users.map((user) => [user._id.toString(), user]),
    );
    const unreadItems = groupedUnreadMessages
      .map((item) => {
        const relatedUser = usersById.get(item._id?.toString());

        if (!relatedUser) {
          return null;
        }

        return {
          [isPatient ? "doctorId" : "patientId"]: relatedUser._id.toString(),
          [isPatient ? "doctor" : "patient"]: relatedUser,
          unreadCount: item.unreadCount,
          latestMessageAt: item.latestMessageAt,
        };
      })
      .filter(Boolean);

    res.json({
      totalUnreadConversations: unreadItems.length,
      totalUnreadMessages: unreadItems.reduce(
        (sum, item) => sum + item.unreadCount,
        0,
      ),
      unreadByPatient: isPatient ? [] : unreadItems,
      unreadByDoctor: isPatient ? unreadItems : [],
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching unread summary",
      error: error.message,
    });
  }
};

export const markConversationAsRead = async (req, res) => {
  try {
    const isPatient = req.user.role === "patient";
    const isDoctor = req.user.role === "doctor" || req.user.role === "admin";

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ message: "Unsupported user role" });
    }

    const patientId = isPatient ? req.user.id : req.body.patientId;
    const senderId = isPatient ? req.body.otherUserId : patientId;

    if (!patientId || !senderId) {
      return res.status(400).json({
        message: isPatient
          ? "A doctor id is required"
          : "A patient id is required",
      });
    }

    const readAt = new Date();
    const query = {
      patient: patientId,
      sender: senderId,
      receiver: req.user.id,
      ...getUnreadFilter(),
    };

    const updateResult = await ChatMessage.updateMany(query, {
      $set: { readAt },
    });

    if (req.io && updateResult.modifiedCount > 0) {
      req.io.emit("messages-read", {
        patientId,
        senderId,
        readerId: req.user.id,
        readAt,
        modifiedCount: updateResult.modifiedCount,
      });
    }

    res.json({
      markedRead: updateResult.modifiedCount,
      readAt,
      conversationId: isPatient ? senderId : patientId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error marking conversation as read",
      error: error.message,
    });
  }
};
