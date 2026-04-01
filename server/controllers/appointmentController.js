import Appointment from "../models/appointment.js";

// Patient creates appointment
export const createAppointment = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can create appointments" });
    }

    const { doctorId, appointmentDate, reason } = req.body;

    const appointment = await Appointment.create({
      patient: req.user.id,
      doctor: doctorId,
      appointmentDate,
      reason,
    });

    res.status(201).json({
      message: "Appointment requested",
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get appointments (role-based)
export const getAppointments = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "patient") {
      query.patient = req.user.id;
    }

    if (req.user.role === "doctor") {
      query.doctor = req.user.id;
    }

    const appointments = await Appointment.find(query)
      .populate("patient", "name email")
      .populate("doctor", "name email")
      .sort({ createdAt: -1 });

    res.json({
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Doctor updates appointment status
export const updateAppointmentStatus = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json({ message: "Only doctors can update appointment status" });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    appointment.status = req.body.status;
    await appointment.save();

    res.json({
      message: "Appointment updated",
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPatientAppointments = async (req, res) => {
  try {
    const { id } = req.params;

    const appointments = await Appointment.find({
      patient: id,
    })
      .populate("doctor", "name email")
      .sort({ appointmentDate: -1 });

    res.json({
      appointments,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching patient appointments",
      error: error.message,
    });
  }
};

export const addDoctorNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { doctorNotes: notes },
      { new: true },
    );

    res.json({
      message: "Doctor notes saved",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error saving notes",
      error: error.message,
    });
  }
};
