import mongoose from "mongoose";

const doctorAvailabilitySlotSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    start: {
      type: Date,
      required: true,
      index: true,
    },

    end: {
      type: Date,
      required: true,
    },

    timezone: {
      type: String,
      trim: true,
      default: "Africa/Lagos",
    },

    status: {
      type: String,
      enum: ["available", "booked", "canceled"],
      default: "available",
      index: true,
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
  },
  { timestamps: true },
);

doctorAvailabilitySlotSchema.index({ doctor: 1, start: 1, status: 1 });

export default mongoose.models.DoctorAvailabilitySlot ||
  mongoose.model("DoctorAvailabilitySlot", doctorAvailabilitySlotSchema);
