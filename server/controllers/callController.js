import ChatMessage from "../models/chatMessage.js";

const DEFAULT_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

const parseUrls = (value, fallback = []) => {
  if (!value) {
    return fallback;
  }

  const urls = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return urls.length > 0 ? urls : fallback;
};

export const getIceServers = (req, res) => {
  const stunUrls = parseUrls(process.env.STUN_URLS, DEFAULT_STUN_URLS);
  const turnUrls = parseUrls(process.env.TURN_URLS);
  const turnUsername = process.env.TURN_USERNAME?.trim();
  const turnCredential = process.env.TURN_CREDENTIAL?.trim();
  const iceServers = [];

  if (stunUrls.length > 0) {
    iceServers.push({ urls: stunUrls });
  }

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  res.json({ iceServers });
};

export const createCallLog = async (req, res) => {
  try {
    const isPatient = req.user.role === "patient";
    const isDoctor = req.user.role === "doctor" || req.user.role === "admin";

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ message: "Unsupported user role" });
    }

    const {
      patientId: bodyPatientId,
      otherUserId,
      mode,
      status,
      durationSeconds = 0,
      startedAt,
      endedAt,
    } = req.body;
    const patientId = isPatient ? req.user.id : bodyPatientId;

    if (!patientId || !otherUserId || !mode || !status) {
      return res.status(400).json({
        message: "patientId, otherUserId, mode, and status are required",
      });
    }

    const senderId = req.user.id;
    const receiverId = isPatient ? otherUserId : patientId;

    const duration = Number.isFinite(Number(durationSeconds))
      ? Math.max(0, Math.round(Number(durationSeconds)))
      : 0;
    const message =
      status === "completed"
        ? `${mode === "video" ? "Video" : "Voice"} call ended`
        : status === "missed"
          ? `Missed ${mode === "video" ? "video" : "voice"} call`
          : status === "declined"
            ? `${mode === "video" ? "Video" : "Voice"} call declined`
            : `${mode === "video" ? "Video" : "Voice"} call canceled`;

    const chatLog = await ChatMessage.create({
      patient: patientId,
      sender: senderId,
      receiver: receiverId,
      message,
      type: "call_log",
      callDetails: {
        mode,
        status,
        durationSeconds: duration,
        startedAt: startedAt ? new Date(startedAt) : undefined,
        endedAt: endedAt ? new Date(endedAt) : undefined,
      },
    });

    const populatedLog = await ChatMessage.findById(chatLog._id)
      .populate("sender", "name role")
      .populate("receiver", "name role");

    if (req.io) {
      req.io.emit("new-message", populatedLog);
    }

    res.status(201).json({
      message: "Call log created",
      chat: populatedLog,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating call log",
      error: error.message,
    });
  }
};
