import User from "../models/user.js";
import Appointment from "../models/appointment.js";
import VitalReading from "../models/VitalReading.js";
import CareAssignment from "../models/CareAssignment.js";
import Alert from "../models/Alert.js";
import { processAppointmentReminders } from "../utils/appointmentReminders.js";

export const getDoctorDashboard = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Doctors only." });
    }

    const doctorId = req.user.id;

    await processAppointmentReminders({
      io: req.io,
      userId: doctorId,
      role: req.user.role,
    });

    const [
      activeAssignments,
      appointmentPatientIds,
      vitalPatientIds,
      emergencyPatientIds,
    ] =
      await Promise.all([
        CareAssignment.find({
          doctor: doctorId,
          status: "active",
        })
          .select("patient")
          .lean(),
        Appointment.distinct("patient", { doctor: doctorId }),
        VitalReading.distinct("patient", { doctor: doctorId }),
        Alert.distinct("patient", {
          doctor: doctorId,
          type: "emergency",
          status: "active",
        }),
      ]);

    const totalPatients = new Set([
      ...activeAssignments.map((assignment) => assignment.patient.toString()),
      ...appointmentPatientIds.map((patientId) => patientId.toString()),
      ...vitalPatientIds.map((patientId) => patientId.toString()),
      ...emergencyPatientIds.map((patientId) => patientId.toString()),
    ]).size;

    // Total appointments
    const totalAppointments = await Appointment.countDocuments({
      doctor: doctorId,
    });

    // Pending appointments
    const pendingAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      status: "pending",
    });

    // Approved appointments
    const approvedAppointments = await Appointment.countDocuments({
      doctor: doctorId,
      status: "approved",
    });

    // Flagged vitals are shown to doctors as active critical alerts.
    const flaggedVitals = await VitalReading.countDocuments({
      doctor: doctorId,
      flagged: true,
      reviewedByDoctor: false,
    });

    const activeEmergencyAlerts = await Alert.countDocuments({
      doctor: doctorId,
      type: "emergency",
      status: "active",
    });

    // Appointments today
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const appointmentsToday = await Appointment.countDocuments({
      doctor: doctorId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    res.json({
      totalPatients,
      totalAppointments,
      pendingAppointments,
      approvedAppointments,
      flaggedVitals,
      activeEmergencyAlerts,
      appointmentsToday,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
