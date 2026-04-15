import Appointment from "../models/appointment.js";
import DoctorAvailabilitySlot from "../models/DoctorAvailabilitySlot.js";
import User from "../models/user.js";
import CareAssignment from "../models/CareAssignment.js";
import { getActiveAssignment, upsertActiveAssignment } from "../utils/careAssignments.js";
import {
  createNotification,
  createNotifications,
  getAdminRecipientIds,
} from "../utils/notifications.js";

const getPopulatedAppointment = (appointmentId) =>
  Appointment.findById(appointmentId)
    .populate("patient", "name email")
    .populate("doctor", "name email specialty isOnline workloadStatus")
    .populate("preferredDoctor", "name email specialty isOnline workloadStatus")
    .populate("slot");

// Patient creates appointment
export const createAppointment = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can create appointments" });
    }

    const { doctorId, appointmentDate, appointmentTimezone, reason, slotId } =
      req.body;
    const preferredDoctorId = doctorId || null;
    let preferredDoctor = null;
    let selectedSlot = null;

    if (preferredDoctorId) {
      preferredDoctor = await User.findOne({
        _id: preferredDoctorId,
        role: "doctor",
      });

      if (!preferredDoctor) {
        return res.status(404).json({ message: "Preferred doctor not found" });
      }
    }

    if (slotId) {
      selectedSlot = await DoctorAvailabilitySlot.findById(slotId);

      if (!selectedSlot || selectedSlot.status !== "available") {
        return res.status(400).json({
          message: "Selected slot is no longer available",
        });
      }

      preferredDoctor = await User.findOne({
        _id: selectedSlot.doctor,
        role: "doctor",
      });
    }

    const activeAssignment = await getActiveAssignment(req.user.id).select("doctor");
    const routedDoctorId =
      selectedSlot?.doctor || activeAssignment?.doctor || null;
    const scheduledDate = selectedSlot?.start || appointmentDate;

    const appointment = await Appointment.create({
      patient: req.user.id,
      doctor: routedDoctorId,
      preferredDoctor: preferredDoctor?._id || null,
      appointmentDate: scheduledDate,
      appointmentTimezone:
        selectedSlot?.timezone || appointmentTimezone || "Africa/Lagos",
      slot: selectedSlot?._id || null,
      reason,
      routedAt: routedDoctorId ? new Date() : null,
    });

    if (selectedSlot) {
      selectedSlot.status = "booked";
      selectedSlot.appointment = appointment._id;
      await selectedSlot.save();
    }

    if (routedDoctorId) {
      await upsertActiveAssignment({
        patientId: req.user.id,
        doctorId: routedDoctorId,
        assignedBy: req.user.id,
        source: "appointment",
        note: "Patient appointment request routed to assigned doctor.",
      });
    }

    const populatedAppointment = await getPopulatedAppointment(appointment._id);

    await createNotification({
      io: req.io,
      recipientId: req.user.id,
      actorId: req.user.id,
      type: "appointment_requested",
      category: "appointment",
      title: "Appointment request submitted",
      message: routedDoctorId
        ? "Your appointment request was routed to your current doctor."
        : "Your appointment request is waiting for admin routing.",
      link: "/appointments",
      metadata: {
        appointmentId: appointment._id.toString(),
      },
    });

    if (routedDoctorId) {
      await createNotification({
        io: req.io,
        recipientId: routedDoctorId,
        actorId: req.user.id,
        type: "appointment_requested",
        category: "appointment",
        title: "New appointment request",
        message: `${req.user.name || "A patient"} requested an appointment.`,
        link: `/patients/${req.user.id}?appointment=${appointment._id}&chat=1`,
        priority: "important",
        metadata: {
          appointmentId: appointment._id.toString(),
          patientId: req.user.id.toString(),
        },
      });
    } else {
      const adminRecipientIds = await getAdminRecipientIds();
      await createNotifications({
        io: req.io,
        recipientIds: adminRecipientIds,
        actorId: req.user.id,
        type: "appointment_intake_waiting",
        category: "appointment",
        title: "New intake appointment request",
        message: `${req.user.name || "A patient"} is waiting for admin routing.`,
        link: `/admin/patients/${req.user.id}`,
        priority: "important",
        metadata: {
          appointmentId: appointment._id.toString(),
          patientId: req.user.id.toString(),
        },
      });
    }

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
      .populate("doctor", "name email specialty isOnline workloadStatus")
      .populate(
        "preferredDoctor",
        "name email specialty isOnline workloadStatus",
      )
      .populate("slot")
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
    if (!appointment.routedAt) {
      appointment.routedAt = new Date();
    }
    if (
      req.body.status === "completed" &&
      !appointment.consultationCompletedAt
    ) {
      appointment.consultationCompletedAt = new Date();
    }
    await appointment.save();

    await createNotification({
      io: req.io,
      recipientId: appointment.patient,
      actorId: req.user.id,
      type: "appointment_status_updated",
      category: "appointment",
      title: "Appointment status updated",
      message: `Your appointment was marked ${appointment.status}.`,
      link: "/appointments",
      priority: appointment.status === "completed" ? "important" : "normal",
      metadata: {
        appointmentId: appointment._id.toString(),
      },
    });

    const populatedAppointment = await getPopulatedAppointment(appointment._id);
    req.io?.emit("appointment:updated", {
      appointment: populatedAppointment,
      doctorId: appointment.doctor?.toString() || "",
      patientId: appointment.patient?.toString() || "",
      status: appointment.status,
    });

    res.json({
      message: "Appointment updated",
      appointment: populatedAppointment,
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
      .populate("doctor", "name email specialty isOnline workloadStatus")
      .populate(
        "preferredDoctor",
        "name email specialty isOnline workloadStatus",
      )
      .populate("slot")
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
    const notes = req.body.notes?.trim() || "";

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.doctor || appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      {
        doctorNotes: notes,
        visitSummary: notes,
        consultationUpdatedAt: new Date(),
      },
      { new: true },
    );

    await createNotification({
      io: req.io,
      recipientId: updatedAppointment.patient,
      actorId: req.user.id,
      type: "consultation_record_updated",
      category: "consultation",
      title: "Consultation notes updated",
      message: "Your doctor updated your visit summary.",
      link: "/appointments",
      priority: "important",
      metadata: {
        appointmentId: updatedAppointment._id.toString(),
      },
    });

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

export const updateConsultationRecord = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Only doctors can update consultation records",
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.doctor || appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const diagnosis = req.body.diagnosis?.trim() || "";
    const prescription = req.body.prescription?.trim() || "";
    const followUpPlan = req.body.followUpPlan?.trim() || "";
    const visitSummary = req.body.visitSummary?.trim() || "";

    appointment.diagnosis = diagnosis;
    appointment.prescription = prescription;
    appointment.followUpPlan = followUpPlan;
    appointment.visitSummary = visitSummary;
    appointment.doctorNotes = visitSummary;
    appointment.consultationUpdatedAt = new Date();

    if (req.body.markCompleted === true) {
      appointment.status = "completed";
      appointment.consultationCompletedAt =
        appointment.consultationCompletedAt || new Date();
    }

    await appointment.save();

    await createNotification({
      io: req.io,
      recipientId: appointment.patient,
      actorId: req.user.id,
      type: "consultation_record_updated",
      category: "consultation",
      title: "Visit record updated",
      message:
        appointment.status === "completed"
          ? "Your doctor completed your visit summary and next steps."
          : "Your doctor updated your consultation record.",
      link: "/appointments",
      priority: "important",
      metadata: {
        appointmentId: appointment._id.toString(),
      },
    });

    const populatedAppointment = await getPopulatedAppointment(appointment._id);

    req.io?.emit("appointment:updated", {
      appointment: populatedAppointment,
      doctorId: appointment.doctor?.toString() || "",
      patientId: appointment.patient?.toString() || "",
      status: appointment.status,
    });

    res.json({
      message: "Consultation record saved",
      appointment: populatedAppointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating consultation record",
      error: error.message,
    });
  }
};
