import ChatMessage from "../models/chatMessage.js";

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { patient, sender, receiver, message, type, fileUrl } = req.body;

    const chat = await ChatMessage.create({
      patient,
      sender,
      receiver,
      message,
      type,
      fileUrl,
    });

    if (req.io) {
      req.io.emit("new-message", chat);
    }

    res.status(201).json({
      message: "Message sent",
      chat,
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

    const messages = await ChatMessage.find({ patient: patientId })
      .populate("sender", "name role")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching messages",
      error: error.message,
    });
  }
};
