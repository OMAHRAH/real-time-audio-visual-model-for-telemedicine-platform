import Appointment from "../models/appointment.js";
import User from "../models/user.js";
import CareAssignment from "../models/CareAssignment.js";
import { getActiveAssignment, upsertActiveAssignment } from "../utils/careAssignments.js";

// Patient creates appointment
export const createAppointment = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can create appointments" });
    }

    const { doctorId, appointmentDate, reason } = req.body;
    const preferredDoctorId = doctorId || null;
    let preferredDoctor = null;

    if (preferredDoctorId) {
      preferredDoctor = await User.findOne({
        _id: preferredDoctorId,
        role: "doctor",
      });

      if (!preferredDoctor) {
        return res.status(404).json({ message: "Preferred doctor not found" });
      }
    }

    const activeAssignment = await getActiveAssignment(req.user.id).select("doctor");
    const routedDoctorId = activeAssignment?.doctor || null;

    const appointment = await Appointment.create({
      patient: req.user.id,
      doctor: routedDoctorId,
      preferredDoctor: preferredDoctor?._id || null,
      appointmentDate,
      reason,
    });

    if (routedDoctorId) {
      await upsertActiveAssignment({
        patientId: req.user.id,
        doctorId: routedDoctorId,
        assignedBy: req.user.id,
        source: "appointment",
        note: "Patient appointment request routed to assigned doctor.",
      });
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("doctor", "name email specialty isOnline")
      .populate("preferredDoctor", "name email specialty isOnline");

    res.status(201).json({
      message: routedDoctorId
        ? "Appointment requested"
        : "Appointment request submitted and is waiting for admin routing.",
      appointment: populatedAppointment,
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
      .populate("doctor", "name email specialty isOnline")
      .populate("preferredDoctor", "name email specialty isOnline")
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

    const appointments = await Appointment.find({
      patient: id,
    })
      .populate("doctor", "name email specialty isOnline")
      .populate("preferredDoctor", "name email specialty isOnline")
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
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can update notes" });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.doctor || appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      { doctorNotes: notes },
      { new: true },
    );

    res.json({
      message: "Doctor notes saved",
      appointment: updatedAppointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error saving notes",
      error: error.message,
    });
  }
};
