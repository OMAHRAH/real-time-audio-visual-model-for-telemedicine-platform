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

    hospitalNumber: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      default: null,
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
      dateOfBirth: {
        type: Date,
        default: null,
      },
      gender: {
        type: String,
        enum: ["", "female", "male", "non_binary", "prefer_not_to_say"],
        default: "",
      },
      bloodGroup: {
        type: String,
        trim: true,
        default: "",
      },
      heightCm: {
        type: Number,
        min: 0,
        default: null,
      },
      weightKg: {
        type: Number,
        min: 0,
        default: null,
      },
      emergencyContact: {
        name: {
          type: String,
          trim: true,
          default: "",
        },
        phone: {
          type: String,
          trim: true,
          default: "",
        },
        relationship: {
          type: String,
          trim: true,
          default: "",
        },
      },
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
