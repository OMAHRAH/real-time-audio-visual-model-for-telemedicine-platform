import VitalReading from "../models/VitalReading.js";
import Appointment from "../models/appointment.js";
import CareAssignment from "../models/CareAssignment.js";
import { getActiveAssignment, upsertActiveAssignment } from "../utils/careAssignments.js";
import {
  createNotification,
  createNotifications,
  getAdminRecipientIds,
} from "../utils/notifications.js";

export const createVitalReading = async (req, res) => {
  try {
    const { type, systolic, diastolic, glucoseLevel, doctor, doctorId } =
      req.body;

    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can submit readings" });
    }

    // Detect dangerous readings
    let flagged = false;

    if (systolic && systolic > 160) flagged = true;
    if (diastolic && diastolic > 100) flagged = true;
    if (glucoseLevel && glucoseLevel > 180) flagged = true;

    const requestedDoctorId = doctorId || doctor || null;
    const activeAssignment = await getActiveAssignment(req.user.id).select("doctor");
    const routedDoctorId = activeAssignment?.doctor || requestedDoctorId || null;

    const vital = await VitalReading.create({
      type,
      systolic,
      diastolic,
      glucoseLevel,
      doctor: routedDoctorId,
      patient: req.user.id,
      flagged,
      routedAt: routedDoctorId ? new Date() : null,
    });

    if (routedDoctorId) {
      await upsertActiveAssignment({
        patientId: req.user.id,
        doctorId: routedDoctorId,
        assignedBy: req.user.id,
        source: "vital",
        note: "Patient vitals routed to assigned doctor.",
      });
    }

    const populatedVital = await VitalReading.findById(vital._id)
      .populate("patient", "name email hospitalNumber")
      .populate("doctor", "name email");

    if (vital.flagged) {
      const io = req.app.get("io");

      io.emit("criticalAlert", {
        message: "New critical patient vital detected",
        vital: populatedVital,
      });

      if (routedDoctorId) {
        await createNotification({
          io: req.io,
          recipientId: routedDoctorId,
          actorId: req.user.id,
          type: "critical_vital_alert",
          category: "vital",
          title: "Critical vital submitted",
          message: "A patient submitted a flagged vital reading.",
          link: `/patients/${req.user.id}?chat=1`,
          priority: "critical",
          metadata: {
            vitalId: vital._id.toString(),
            patientId: req.user.id.toString(),
          },
        });
      } else {
        const adminRecipientIds = await getAdminRecipientIds();
        await createNotifications({
          io: req.io,
          recipientIds: adminRecipientIds,
          actorId: req.user.id,
          type: "critical_vital_intake",
          category: "vital",
          title: "Critical vital awaiting routing",
          message:
            "A patient submitted a flagged vital reading that needs admin routing.",
          link: `/admin/patients/${req.user.id}`,
          priority: "critical",
          metadata: {
            vitalId: vital._id.toString(),
            patientId: req.user.id.toString(),
          },
        });
      }
    }

    res.status(201).json({
      message: routedDoctorId
        ? "Vital reading saved"
        : "Vital reading saved and is waiting for admin routing.",
      vital: populatedVital,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCriticalAlerts = async (req, res) => {
  try {
    const query = {
      flagged: true,
      reviewedByDoctor: false,
    };

    if (req.user.role === "patient") {
      query.patient = req.user.id;
    }

    if (req.user.role === "doctor") {
      query.doctor = req.user.id;
    }

    const alerts = await VitalReading.find(query)
      .populate("patient", "name email hospitalNumber")
      .populate("doctor", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFlaggedReadings = async (req, res) => {
  try {
    // Only doctor allowed
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const readings = await VitalReading.find({
      doctor: req.user.id,
      flagged: true,
    }).populate("patient", "name email hospitalNumber");

    res.json({
      count: readings.length,
      readings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit vital reading
export const submitVital = async (req, res) => {
  try {
    const { type, systolic, diastolic, glucoseLevel, doctorId } = req.body;

    // Only patients allowed
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can submit readings" });
    }

    let flagged = false;

    // BP Logic
    if (type === "bp") {
      if (!systolic || !diastolic) {
        return res
          .status(400)
          .json({ message: "BP requires systolic and diastolic values" });
      }

      if (systolic > 140 || diastolic > 90) {
        flagged = true;
      }
    }

    // Sugar Logic
    if (type === "sugar") {
      if (!glucoseLevel) {
        return res
          .status(400)
          .json({ message: "Sugar reading requires glucose level" });
      }

      if (glucoseLevel > 180) {
        flagged = true;
      }
    }

    const activeAssignment = await getActiveAssignment(req.user.id).select("doctor");
    const routedDoctorId = activeAssignment?.doctor || doctorId || null;

    const reading = await VitalReading.create({
      patient: req.user.id,
      doctor: routedDoctorId,
      type,
      systolic,
      diastolic,
      glucoseLevel,
      flagged,
      routedAt: routedDoctorId ? new Date() : null,
    });

    if (routedDoctorId) {
      await upsertActiveAssignment({
        patientId: req.user.id,
        doctorId: routedDoctorId,
        assignedBy: req.user.id,
        source: "vital",
        note: "Patient vitals routed to assigned doctor.",
      });
    }

    const populatedReading = await VitalReading.findById(reading._id)
      .populate("patient", "name email hospitalNumber")
      .populate("doctor", "name email");

    const io = req.app.get("io");

    if (reading.flagged) {
      io.emit("criticalAlert", {
        message: "New critical patient vital detected",
        vital: populatedReading,
      });

      if (routedDoctorId) {
        await createNotification({
          io: req.io,
          recipientId: routedDoctorId,
          actorId: req.user.id,
          type: "critical_vital_alert",
          category: "vital",
          title: "Critical vital submitted",
          message: "A patient submitted a flagged vital reading.",
          link: `/patients/${req.user.id}?chat=1`,
          priority: "critical",
          metadata: {
            vitalId: reading._id.toString(),
            patientId: req.user.id.toString(),
          },
        });
      } else {
        const adminRecipientIds = await getAdminRecipientIds();
        await createNotifications({
          io: req.io,
          recipientIds: adminRecipientIds,
          actorId: req.user.id,
          type: "critical_vital_intake",
          category: "vital",
          title: "Critical vital awaiting routing",
          message:
            "A patient submitted a flagged vital reading that needs admin routing.",
          link: `/admin/patients/${req.user.id}`,
          priority: "critical",
          metadata: {
            vitalId: reading._id.toString(),
            patientId: req.user.id.toString(),
          },
        });
      }
    }

    res.status(201).json({
      message: routedDoctorId
        ? "Vital reading submitted"
        : "Vital reading submitted and is waiting for admin routing.",
      flagged,
      reading: populatedReading,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const markAsReviewed = async (req, res) => {
  try {
    // Only doctor allowed
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const reading = await VitalReading.findById(req.params.id);

    if (!reading) {
      return res.status(404).json({ message: "Reading not found" });
    }

    // Make sure doctor owns this reading
    if (reading.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    reading.reviewedByDoctor = true;
    reading.reviewedAt = new Date();
    await reading.save();

    res.json({
      message: "Reading marked as reviewed",
      reading,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getVitalHistory = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    let query = {
      createdAt: { $gte: sixMonthsAgo },
    };

    // If patient → only their own readings
    if (req.user.role === "patient") {
      query.patient = req.user.id;
    }

    // If doctor → all readings assigned to them
    if (req.user.role === "doctor") {
      query.doctor = req.user.id;
    }

    const readings = await VitalReading.find(query)
      .populate("patient", "name email hospitalNumber")
      .sort({ createdAt: -1 });

    res.json({
      count: readings.length,
      readings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getLatestVitals = async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "doctor") {
      query.doctor = req.user.id;
    }

    const vitals = await VitalReading.find(query)
      .populate("patient", "name email hospitalNumber")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      count: vitals.length,
      vitals,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const reviewVital = async (req, res) => {
  try {
    const vital = await VitalReading.findById(req.params.id);

    if (!vital) {
      return res.status(404).json({ message: "Vital not found" });
    }

    vital.reviewedByDoctor = true;
    vital.reviewedAt = new Date();
    await vital.save();

    res.json({
      message: "Vital marked as reviewed",
      vital,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getVitalsByPatient = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === "patient" && req.user.id !== id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.role === "doctor") {
      const activeAssignment = await CareAssignment.findOne({
        doctor: req.user.id,
        patient: id,
        status: "active",
      }).lean();
      const hasHistoricalRelationship = await Appointment.exists({
        doctor: req.user.id,
        patient: id,
      });

      if (!activeAssignment && !hasHistoricalRelationship) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    const vitals = await VitalReading.find({ patient: id })
      .populate("patient", "name email hospitalNumber")
      .sort({ createdAt: -1 });

    res.json({ vitals });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
