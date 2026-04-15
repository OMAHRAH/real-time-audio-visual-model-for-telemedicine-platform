import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
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

    preferredDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    appointmentDate: {
      type: Date,
      required: true,
    },

    appointmentTimezone: {
      type: String,
      trim: true,
      default: "Africa/Lagos",
    },

    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorAvailabilitySlot",
      default: null,
    },

    reason: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },

    routedAt: {
      type: Date,
      default: null,
    },

    doctorNotes: {
      type: String,
      default: "",
    },

    diagnosis: {
      type: String,
      default: "",
    },

    prescription: {
      type: String,
      default: "",
    },

    followUpPlan: {
      type: String,
      default: "",
    },

    visitSummary: {
      type: String,
      default: "",
    },

    consultationUpdatedAt: {
      type: Date,
      default: null,
    },

    consultationCompletedAt: {
      type: Date,
      default: null,
    },

    rescheduledAt: {
      type: Date,
      default: null,
    },

    rescheduleReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.models.Appointment ||
  mongoose.model("Appointment", appointmentSchema);
