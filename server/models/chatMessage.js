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
      enum: ["text", "file", "image", "audio", "call_log"],
      default: "text",
    },

    fileUrl: {
      type: String,
    },

    fileName: {
      type: String,
    },

    mimeType: {
      type: String,
    },

    fileSize: {
      type: Number,
    },

    readAt: {
      type: Date,
      default: null,
    },

    callDetails: {
      mode: {
        type: String,
        enum: ["audio", "video"],
      },
      status: {
        type: String,
        enum: ["completed", "missed", "declined", "canceled"],
      },
      durationSeconds: {
        type: Number,
        default: 0,
      },
      startedAt: {
        type: Date,
      },
      endedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true },
);

export default mongoose.model("ChatMessage", chatMessageSchema);
