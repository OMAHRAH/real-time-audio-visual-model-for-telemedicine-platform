import mongoose from "mongoose";

const vitalReadingSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      default: "combined",
    },

    systolic: {
      type: Number,
    },

    diastolic: {
      type: Number,
    },

    glucoseLevel: {
      type: Number,
    },

    flagged: {
      type: Boolean,
      default: false,
    },

    reviewedByDoctor: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.VitalReading ||
  mongoose.model("VitalReading", vitalReadingSchema);
