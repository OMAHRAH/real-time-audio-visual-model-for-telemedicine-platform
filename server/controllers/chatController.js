import mongoose from "mongoose";
import Alert from "../models/Alert.js";
import Appointment from "../models/appointment.js";
import CareAssignment from "../models/CareAssignment.js";
import ChatMessage from "../models/chatMessage.js";
import User from "../models/user.js";
import {
  createNotification,
  markNotificationsRead,
} from "../utils/notifications.js";

const getUnreadFilter = () => ({
  $or: [{ readAt: null }, { readAt: { $exists: false } }],
});

const toObjectId = (value) => new mongoose.Types.ObjectId(value);
const buildConversationRoomId = (patientId, careUserId) =>
  patientId && careUserId ? `conversation:${patientId}:${careUserId}` : "";

const getActiveEmergencyForPatient = (patientId) =>
  Alert.findOne({
    patient: patientId,
    type: "emergency",
    status: "active",
  }).sort({ createdAt: -1 });

const canDoctorAccessPatient = async (doctorId, patientId) => {
  const [activeAssignment, hasHistoricalRelationship] = await Promise.all([
    CareAssignment.findOne({
      doctor: doctorId,
      patient: patientId,
      status: "active",
    }).lean(),
    Appointment.exists({
      doctor: doctorId,
      patient: patientId,
    }),
  ]);

  return Boolean(activeAssignment || hasHistoricalRelationship);
};

const canPatientMessageAdmin = async ({ patientId, adminId }) => {
  const activeEmergency = await getActiveEmergencyForPatient(patientId).lean();

  return Boolean(
    activeEmergency &&
      !activeEmergency.doctor &&
      activeEmergency.triageAdmin &&
      activeEmergency.triageAdmin.toString() === adminId.toString(),
  );
};

const canAdminMessagePatient = async ({ adminId, patientId }) => {
  const activeEmergency = await getActiveEmergencyForPatient(patientId).lean();

  return Boolean(
    activeEmergency &&
      !activeEmergency.doctor &&
      activeEmergency.triageAdmin &&
      activeEmergency.triageAdmin.toString() === adminId.toString(),
  );
};

const populateChat = (query) =>
  query.populate("sender", "name role").populate("receiver", "name role");

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

      const careContact = await User.findOne({
        _id: receiver,
        role: { $in: ["doctor", "admin"] },
      }).lean();

      if (!careContact) {
        return res.status(404).json({ message: "Care contact not found" });
      }

      if (careContact.role === "doctor" && careContact.isOnline === false) {
        return res.status(403).json({
          message: "Doctor is offline and unavailable for chat",
        });
      }

      if (
        careContact.role === "admin" &&
        !(await canPatientMessageAdmin({
          patientId,
          adminId: careContact._id,
        }))
      ) {
        return res.status(403).json({
          message: "Admin emergency triage is not active for this patient",
        });
      }
    }

    if (req.user?.role === "doctor") {
      patientId = patient;
      senderId = req.user.id;
      receiverId = patient;

      if (!(await canDoctorAccessPatient(req.user.id, patientId))) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    if (req.user?.role === "admin") {
      patientId = patient;
      senderId = req.user.id;
      receiverId = patient;

      if (
        !(await canAdminMessagePatient({
          adminId: req.user.id,
          patientId,
        }))
      ) {
        return res.status(403).json({
          message:
            "Admin chat is only available while this patient's emergency case is in triage",
        });
      }
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

    const populatedChat = await populateChat(ChatMessage.findById(chat._id))
      .lean()
      .exec();

    if (req.io) {
      const conversationParticipantId =
        req.user?.role === "patient" ? receiverId : senderId;
      const conversationRoomId = buildConversationRoomId(
        patientId,
        conversationParticipantId,
      );

      req.io.emit("new-message", populatedChat);

      if (conversationRoomId) {
        req.io.to(conversationRoomId).emit(
          "conversation:new-message",
          populatedChat,
        );
      }
    }

    await createNotification({
      io: req.io,
      recipientId: receiverId,
      actorId: senderId,
      type: "chat_message",
      category: "chat",
      title: "New chat message",
      message:
        trimmedMessage ||
        (hasFile
          ? "You received a new attachment in chat."
          : "New message received."),
      link:
        req.user?.role === "patient"
          ? `/patients/${patientId}?chat=1`
          : `/chat?doctor=${senderId}`,
      priority: "normal",
      metadata: {
        patientId: patientId?.toString?.() || patientId,
        conversationUserId: senderId?.toString?.() || senderId,
        chatMessageId: chat._id.toString(),
      },
    });

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

export const getConversation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const otherUserId = req.query.otherUserId || req.query.doctorId || "";
    const query = { patient: patientId };

    if (req.user.role === "patient") {
      if (req.user.id !== patientId) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    if (req.user.role === "doctor") {
      if (!(await canDoctorAccessPatient(req.user.id, patientId))) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    if (otherUserId) {
      query.$or = [
        { sender: patientId, receiver: otherUserId },
        { sender: otherUserId, receiver: patientId },
      ];
    }

    const messages = await populateChat(
      ChatMessage.find(query).sort({ createdAt: 1 }),
    );

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
      role: isPatient ? { $in: ["doctor", "admin"] } : "patient",
    })
      .select(
        isPatient ? "name email specialty isOnline role" : "name email",
      )
      .lean();

    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
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

    await markNotificationsRead({
      io: req.io,
      recipientId: req.user.id,
      extraQuery: {
        type: "chat_message",
        "metadata.patientId": patientId,
        "metadata.conversationUserId": senderId,
      },
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
