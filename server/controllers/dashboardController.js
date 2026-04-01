import User from "../models/user.js";
import Appointment from "../models/appointment.js";
import VitalReading from "../models/VitalReading.js";

export const getDoctorDashboard = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Doctors only." });
    }

    const doctorId = req.user.id;

    // Total unique patients
    const totalPatients = await Appointment.distinct("patient", {
      doctor: doctorId,
    });

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

    // Flagged vitals
    const flaggedVitals = await VitalReading.countDocuments({
      doctor: doctorId,
      flagged: true,
      reviewedByDoctor: false,
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
      totalPatients: totalPatients.length,
      totalAppointments,
      pendingAppointments,
      approvedAppointments,
      flaggedVitals,
      appointmentsToday,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
