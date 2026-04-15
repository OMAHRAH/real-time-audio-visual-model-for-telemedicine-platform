import Appointment from "../models/appointment.js";
import DoctorAvailabilitySlot from "../models/DoctorAvailabilitySlot.js";
import User from "../models/user.js";
import { createNotification } from "../utils/notifications.js";

const MAX_SLOT_LOOKAHEAD_DAYS = 30;

const parseDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const populateSlotQuery = (query) =>
  query
    .populate("doctor", "name email specialty timezone workloadStatus isOnline")
    .populate("appointment", "status appointmentDate patient doctor");

export const getDoctorSlots = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const from = parseDateValue(req.query.from) || new Date();
    const to =
      parseDateValue(req.query.to) ||
      new Date(from.getTime() + MAX_SLOT_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

    const slots = await populateSlotQuery(
      DoctorAvailabilitySlot.find({
        doctor: doctorId,
        status: "available",
        start: { $gte: from, $lte: to },
      }).sort({ start: 1 }),
    )
      .lean()
      .exec();

    res.json({
      slots,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching doctor slots",
      error: error.message,
    });
  }
};

export const getMySchedule = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Doctors only." });
    }

    const now = new Date();
    const slots = await populateSlotQuery(
      DoctorAvailabilitySlot.find({
        doctor: req.user.id,
        start: {
          $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
        status: { $ne: "canceled" },
      }).sort({ start: 1 }),
    )
      .lean()
      .exec();

    res.json({ slots });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching schedule",
      error: error.message,
    });
  }
};

export const createAvailabilitySlot = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Doctors only." });
    }

    const start = parseDateValue(req.body.start);
    const end = parseDateValue(req.body.end);
    const timezone = req.body.timezone?.trim() || "Africa/Lagos";

    if (!start || !end || end <= start) {
      return res.status(400).json({
        message: "Valid start and end times are required",
      });
    }

    const overlappingSlot = await DoctorAvailabilitySlot.findOne({
      doctor: req.user.id,
      status: { $ne: "canceled" },
      $or: [
        { start: { $lt: end, $gte: start } },
        { end: { $gt: start, $lte: end } },
        { start: { $lte: start }, end: { $gte: end } },
      ],
    });

    if (overlappingSlot) {
      return res.status(400).json({
        message: "This slot overlaps with an existing availability block",
      });
    }

    const slot = await DoctorAvailabilitySlot.create({
      doctor: req.user.id,
      start,
      end,
      timezone,
    });

    const populatedSlot = await populateSlotQuery(
      DoctorAvailabilitySlot.findById(slot._id),
    )
      .lean()
      .exec();

    res.status(201).json({
      message: "Availability slot created",
      slot: populatedSlot,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating availability slot",
      error: error.message,
    });
  }
};

export const cancelAvailabilitySlot = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Doctors only." });
    }

    const slot = await DoctorAvailabilitySlot.findById(req.params.id);

    if (!slot || String(slot.doctor) !== req.user.id) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (slot.status === "booked") {
      return res.status(400).json({
        message: "Booked slots cannot be canceled directly",
      });
    }

    slot.status = "canceled";
    await slot.save();

    res.json({
      message: "Availability slot canceled",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error canceling availability slot",
      error: error.message,
    });
  }
};

export const rescheduleAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "name email hospitalNumber")
      .populate("doctor", "name email specialty timezone");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const isPatientOwner =
      req.user.role === "patient" && String(appointment.patient?._id) === req.user.id;
    const isAssignedDoctor =
      req.user.role === "doctor" && String(appointment.doctor?._id) === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isPatientOwner && !isAssignedDoctor && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        message: "Completed appointments cannot be rescheduled",
      });
    }

    const slotId = req.body.slotId;
    const manualDate = parseDateValue(req.body.appointmentDate);
    const rescheduleReason = req.body.rescheduleReason?.trim() || "";
    let nextSlot = null;

    if (slotId) {
      nextSlot = await DoctorAvailabilitySlot.findById(slotId);

      if (!nextSlot || nextSlot.status !== "available") {
        return res.status(400).json({
          message: "Selected slot is no longer available",
        });
      }
    }

    if (!nextSlot && !manualDate) {
      return res.status(400).json({
        message: "Choose a new slot or provide a reschedule date",
      });
    }

    if (appointment.slot) {
      const previousSlot = await DoctorAvailabilitySlot.findById(appointment.slot);

      if (previousSlot && previousSlot.status === "booked") {
        previousSlot.status = "available";
        previousSlot.appointment = null;
        await previousSlot.save();
      }
    }

    if (nextSlot) {
      appointment.slot = nextSlot._id;
      appointment.doctor = nextSlot.doctor;
      appointment.preferredDoctor = nextSlot.doctor;
      appointment.appointmentDate = nextSlot.start;
      appointment.appointmentTimezone = nextSlot.timezone || "Africa/Lagos";
      appointment.routedAt = new Date();

      nextSlot.status = "booked";
      nextSlot.appointment = appointment._id;
      await nextSlot.save();
    } else {
      appointment.slot = null;
      appointment.appointmentDate = manualDate;
      appointment.appointmentTimezone =
        req.body.appointmentTimezone?.trim() || appointment.appointmentTimezone;
    }

    appointment.rescheduledAt = new Date();
    appointment.rescheduleReason = rescheduleReason;
    appointment.reminders = {
      dayBeforeSentAt: null,
      hourBeforeSentAt: null,
    };

    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patient", "name email hospitalNumber")
      .populate("doctor", "name email specialty timezone workloadStatus isOnline")
      .populate("preferredDoctor", "name email specialty timezone workloadStatus isOnline")
      .populate("slot");

    req.io?.emit("appointment:updated", {
      appointment: populatedAppointment,
      doctorId: appointment.doctor?._id?.toString?.() || appointment.doctor?.toString?.() || "",
      patientId: appointment.patient?._id?.toString?.() || appointment.patient?.toString?.() || "",
      status: appointment.status,
    });

    const actorName = req.user.name || "Care team";

    await createNotification({
      io: req.io,
      recipientId: appointment.patient._id,
      actorId: req.user.id,
      type: "appointment_rescheduled",
      category: "appointment",
      title: "Appointment rescheduled",
      message: `${actorName} moved your appointment to ${appointment.appointmentDate.toLocaleString()}.`,
      link: "/appointments",
      priority: "important",
      metadata: {
        appointmentId: appointment._id.toString(),
      },
    });

    if (appointment.doctor?._id) {
      await createNotification({
        io: req.io,
        recipientId: appointment.doctor._id,
        actorId: req.user.id,
        type: "appointment_rescheduled",
        category: "appointment",
        title: "Appointment updated",
        message: `${appointment.patient?.name || "A patient"} has a rescheduled appointment.`,
        link: `/patients/${appointment.patient._id}?appointment=${appointment._id}&chat=1`,
        priority: "important",
        metadata: {
          appointmentId: appointment._id.toString(),
          patientId: appointment.patient._id.toString(),
        },
      });
    }

    res.json({
      message: "Appointment rescheduled",
      appointment: populatedAppointment,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error rescheduling appointment",
      error: error.message,
    });
  }
};
