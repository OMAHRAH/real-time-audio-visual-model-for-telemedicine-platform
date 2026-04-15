import mongoose from "mongoose";
import { DOCTOR_WORKLOAD_STATUSES } from "../utils/doctorStatus.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      default: "patient",
    },

    specialty: {
      type: String,
      trim: true,
      default: "",
    },

    isOnline: {
      type: Boolean,
      default: true,
    },

    workloadStatus: {
      type: String,
      enum: DOCTOR_WORKLOAD_STATUSES,
      default: "available",
    },

    timezone: {
      type: String,
      trim: true,
      default: "Africa/Lagos",
    },

    medicalProfile: {
      allergies: {
        type: [String],
        default: [],
      },
      medications: {
        type: [String],
        default: [],
      },
      medicalHistory: {
        type: [String],
        default: [],
      },
      ongoingConditions: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.User || mongoose.model("User", userSchema);
