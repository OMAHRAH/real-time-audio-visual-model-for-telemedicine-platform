import Alert from "../models/Alert.js";
import Appointment from "../models/appointment.js";
import CareAssignment from "../models/CareAssignment.js";
import User from "../models/user.js";
import VitalReading from "../models/VitalReading.js";
import { upsertActiveAssignment } from "../utils/careAssignments.js";

const getDoctorLoadMaps = ({ activeAssignments, pendingAppointments, criticalVitals }) => {
  const activeAssignmentsByDoctor = new Map();
  activeAssignments.forEach((assignment) => {
    const doctorId = assignment.doctor?._id?.toString();
    if (!doctorId) return;

    activeAssignmentsByDoctor.set(
      doctorId,
      (activeAssignmentsByDoctor.get(doctorId) || 0) + 1,
    );
  });

  const pendingAppointmentsByDoctor = new Map();
  pendingAppointments.forEach((appointment) => {
    const doctorId = appointment.doctor?._id?.toString();
    if (!doctorId) return;

    pendingAppointmentsByDoctor.set(
      doctorId,
      (pendingAppointmentsByDoctor.get(doctorId) || 0) + 1,
    );
  });

  const criticalVitalsByDoctor = new Map();
  criticalVitals.forEach((reading) => {
    const doctorId = reading.doctor?._id?.toString();
    if (!doctorId) return;

    criticalVitalsByDoctor.set(
      doctorId,
      (criticalVitalsByDoctor.get(doctorId) || 0) + 1,
    );
  });

  return {
    activeAssignmentsByDoctor,
    pendingAppointmentsByDoctor,
    criticalVitalsByDoctor,
  };
};

const mapDoctorsWithLoad = ({ doctors, activeAssignments, pendingAppointments, criticalVitals }) => {
  const {
    activeAssignmentsByDoctor,
    pendingAppointmentsByDoctor,
    criticalVitalsByDoctor,
  } = getDoctorLoadMaps({
    activeAssignments,
    pendingAppointments,
    criticalVitals,
  });

  return doctors.map((doctor) => ({
    ...doctor,
    isOnline: doctor.isOnline !== false,
    specialty: doctor.specialty || "General Medicine",
    assignmentCount: activeAssignmentsByDoctor.get(doctor._id.toString()) || 0,
    pendingAppointmentCount:
      pendingAppointmentsByDoctor.get(doctor._id.toString()) || 0,
    criticalVitalCount:
      criticalVitalsByDoctor.get(doctor._id.toString()) || 0,
  }));
};

export const getAdminDashboard = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only." });
    }

    const [patients, doctors, activeAssignments, pendingAppointments, criticalVitals] =
      await Promise.all([
        User.find({ role: "patient" })
          .select("name email createdAt")
          .sort({ createdAt: -1 })
          .lean(),
        User.find({ role: "doctor" })
          .select("name email specialty isOnline createdAt")
          .sort({ isOnline: -1, name: 1 })
          .lean(),
        CareAssignment.find({ status: "active" })
          .populate("patient", "name email")
          .populate("doctor", "name email specialty isOnline")
          .sort({ updatedAt: -1 })
          .lean(),
        Appointment.find({ status: "pending" })
          .populate("patient", "name email")
          .populate("doctor", "name email specialty isOnline")
          .populate("preferredDoctor", "name email specialty isOnline")
          .sort({ appointmentDate: 1 })
          .lean(),
        VitalReading.find({
          flagged: true,
          reviewedByDoctor: false,
        })
          .populate("patient", "name email")
          .populate("doctor", "name email specialty isOnline")
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    const assignedPatientIds = new Set(
      activeAssignments.map((assignment) => assignment.patient?._id?.toString()).filter(Boolean),
    );

    const unassignedPatients = patients.filter(
      (patient) => !assignedPatientIds.has(patient._id.toString()),
    );

    res.json({
      metrics: {
        totalPatients: patients.length,
        totalDoctors: doctors.length,
        onlineDoctors: doctors.filter((doctor) => doctor.isOnline !== false).length,
        activeAssignments: activeAssignments.length,
        unassignedPatients: unassignedPatients.length,
        pendingAppointments: pendingAppointments.length,
        criticalVitals: criticalVitals.length,
      },
      doctors: mapDoctorsWithLoad({
        doctors,
        activeAssignments,
        pendingAppointments,
        criticalVitals,
      }),
      activeAssignments,
      unassignedPatients,
      pendingAppointments,
      criticalVitals,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error loading admin dashboard",
      error: error.message,
    });
  }
};

export const routePatientToDoctor = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only." });
    }

    const { patientId, doctorId, note } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({
        message: "Patient and doctor are required for routing",
      });
    }

    const [patient, doctor] = await Promise.all([
      User.findOne({ _id: patientId, role: "patient" }),
      User.findOne({ _id: doctorId, role: "doctor" }),
    ]);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const assignment = await upsertActiveAssignment({
      patientId,
      doctorId,
      assignedBy: req.user.id,
      source: "manual",
      note: note || "Patient routed by admin.",
    });

    await Promise.all([
      Appointment.updateMany(
        {
          patient: patientId,
          status: { $in: ["pending", "approved"] },
        },
        {
          $set: { doctor: doctorId },
        },
      ),
      VitalReading.updateMany(
        {
          patient: patientId,
          reviewedByDoctor: false,
        },
        {
          $set: { doctor: doctorId },
        },
      ),
      Alert.updateMany(
        {
          patient: patientId,
          status: "active",
        },
        {
          $set: { doctor: doctorId },
        },
      ),
    ]);

    const populatedAssignment = await CareAssignment.findById(assignment._id)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty isOnline")
      .populate("assignedBy", "name email role")
      .lean();

    res.json({
      message: "Patient routed successfully",
      assignment: populatedAssignment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error routing patient",
      error: error.message,
    });
  }
};

export const getAdminPatientProfile = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only." });
    }

    const patientId = req.params.id;

    const [
      patient,
      vitals,
      appointments,
      activeAssignment,
      assignmentHistory,
      alerts,
      doctors,
      activeAssignments,
      pendingAppointments,
      criticalVitals,
    ] = await Promise.all([
      User.findOne({ _id: patientId, role: "patient" })
        .select("name email createdAt")
        .lean(),
      VitalReading.find({ patient: patientId })
        .populate("patient", "name email")
        .populate("doctor", "name email specialty isOnline")
        .sort({ createdAt: -1 })
        .lean(),
      Appointment.find({ patient: patientId })
        .populate("doctor", "name email specialty isOnline")
        .populate("preferredDoctor", "name email specialty isOnline")
        .sort({ appointmentDate: -1 })
        .lean(),
      CareAssignment.findOne({ patient: patientId, status: "active" })
        .populate("doctor", "name email specialty isOnline")
        .populate("assignedBy", "name email role")
        .lean(),
      CareAssignment.find({ patient: patientId })
        .populate("doctor", "name email specialty isOnline")
        .populate("assignedBy", "name email role")
        .sort({ updatedAt: -1 })
        .lean(),
      Alert.find({ patient: patientId })
        .populate("doctor", "name email specialty isOnline")
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ role: "doctor" })
        .select("name email specialty isOnline createdAt")
        .sort({ isOnline: -1, name: 1 })
        .lean(),
      CareAssignment.find({ status: "active" })
        .populate("doctor", "name email specialty isOnline")
        .lean(),
      Appointment.find({ status: "pending" })
        .populate("doctor", "name email specialty isOnline")
        .lean(),
      VitalReading.find({
        flagged: true,
        reviewedByDoctor: false,
      })
        .populate("doctor", "name email specialty isOnline")
        .lean(),
    ]);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const availableDoctors = mapDoctorsWithLoad({
      doctors,
      activeAssignments,
      pendingAppointments,
      criticalVitals,
    });

    res.json({
      patient,
      vitals,
      appointments,
      activeAssignment,
      assignmentHistory,
      alerts,
      doctors: availableDoctors,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error loading admin patient profile",
      error: error.message,
    });
  }
};
