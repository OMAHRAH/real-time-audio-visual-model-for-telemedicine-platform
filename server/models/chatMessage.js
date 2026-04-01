import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
    },

    type: {
      type: String,
      enum: ["text", "file", "audio"],
      default: "text",
    },

    fileUrl: {
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ChatMessage", chatMessageSchema);
