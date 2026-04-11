import Alert from "../models/Alert.js";
import User from "../models/user.js";
import { getActiveAssignment, upsertActiveAssignment } from "../utils/careAssignments.js";

export const getAlerts = async (req, res) => {
  try {
    const query = {};

    if (req.user?.role === "doctor") {
      query.doctor = req.user.id;
    }

    if (req.user?.role === "patient") {
      query.patient = req.user.id;
    }

    const alerts = await Alert.find(query)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty isOnline")
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createEmergencyAlert = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can send emergency alerts" });
    }

    const requestedDoctorId = req.body.doctorId || null;
    let doctor = null;

    if (requestedDoctorId) {
      doctor = await User.findOne({
        _id: requestedDoctorId,
        role: "doctor",
      });

      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
    } else {
      const activeAssignment = await getActiveAssignment(req.user.id).populate(
        "doctor",
        "name email specialty isOnline",
      );

      doctor = activeAssignment?.doctor || null;
    }

    const alert = await Alert.create({
      patient: req.user.id,
      doctor: doctor?._id || null,
      message:
        req.body.message ||
        "Emergency assistance requested by patient. Please respond immediately.",
      type: "emergency",
      status: "active",
    });

    if (doctor?._id) {
      await upsertActiveAssignment({
        patientId: req.user.id,
        doctorId: doctor._id,
        assignedBy: req.user.id,
        source: "emergency",
        note: "Emergency alert routed to assigned doctor.",
      });
    }

    const populatedAlert = await Alert.findById(alert._id)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty isOnline");

    if (req.io) {
      req.io.emit("emergencyAlert", populatedAlert);
    }

    res.status(201).json({
      message: doctor?._id
        ? "Emergency alert sent"
        : "Emergency alert sent and is waiting for admin routing.",
      alert: populatedAlert,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error sending emergency alert",
      error: error.message,
    });
  }
};
