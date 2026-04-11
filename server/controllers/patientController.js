import Appointment from "../models/appointment.js";
import User from "../models/user.js";

export const getPatients = async (req, res) => {
  try {
    const patients = await User.find({ role: "patient" })
      .select("name email createdAt")
      .sort({ name: 1 })
      .lean();

    const patientIds = patients.map((patient) => patient._id);
    const appointmentQuery = { patient: { $in: patientIds } };

    if (req.user.role === "doctor") {
      appointmentQuery.doctor = req.user.id;
    }

    const appointments = await Appointment.find(appointmentQuery)
      .select("patient appointmentDate")
      .sort({ appointmentDate: -1 })
      .lean();

    const lastAppointmentByPatient = new Map();

    appointments.forEach((appointment) => {
      const patientId = appointment.patient.toString();

      if (!lastAppointmentByPatient.has(patientId)) {
        lastAppointmentByPatient.set(patientId, appointment.appointmentDate);
      }
    });

    res.json({
      count: patients.length,
      patients: patients.map((patient) => ({
        ...patient,
        lastAppointment:
          lastAppointmentByPatient.get(patient._id.toString()) || null,
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching patients",
      error: error.message,
    });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const patient = await User.findOne({
      _id: req.params.id,
      role: "patient",
    })
      .select("name email createdAt")
      .lean();

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json({ patient });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching patient",
      error: error.message,
    });
  }
};
