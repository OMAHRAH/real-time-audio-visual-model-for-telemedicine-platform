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

    vitalReading: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VitalReading",
    },
  },
  { timestamps: true },
);

export default mongoose.models.Alert || mongoose.model("Alert", alertSchema);
