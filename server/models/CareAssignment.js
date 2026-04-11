import mongoose from "mongoose";

const careAssignmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "transferred", "closed"],
      default: "active",
      index: true,
    },

    source: {
      type: String,
      enum: ["manual", "appointment", "vital", "emergency"],
      default: "manual",
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    lastRoutedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

careAssignmentSchema.index({ patient: 1, status: 1 });

export default mongoose.models.CareAssignment ||
  mongoose.model("CareAssignment", careAssignmentSchema);
