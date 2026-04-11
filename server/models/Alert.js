import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["critical_vital", "emergency"],
      default: "critical_vital",
    },

    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
    },

    vitalReading: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VitalReading",
    },
  },
  { timestamps: true },
);

export default mongoose.models.Alert || mongoose.model("Alert", alertSchema);
