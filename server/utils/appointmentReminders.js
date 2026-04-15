import Appointment from "../models/appointment.js";
import { createNotification } from "./notifications.js";

const ACTIVE_APPOINTMENT_STATUSES = [
  "pending",
  "approved",
  "scheduled",
  "confirmed",
];

const DAY_BEFORE_WINDOW_MS = 24 * 60 * 60 * 1000;
const HOUR_BEFORE_WINDOW_MS = 60 * 60 * 1000;

const formatAppointmentDateTime = (appointmentDate, timezone) => {
  const parsed = new Date(appointmentDate);

  if (Number.isNaN(parsed.getTime())) {
    return "your scheduled visit";
  }

  return parsed.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || "Africa/Lagos",
  });
};

const getReminderDefinition = (msUntil) => {
  if (msUntil <= 0) {
    return null;
  }

  if (msUntil <= HOUR_BEFORE_WINDOW_MS) {
    return {
      key: "hourBeforeSentAt",
      patientType: "appointment_reminder_1h",
      doctorType: "doctor_appointment_reminder_1h",
      patientTitle: "Appointment in less than 1 hour",
      doctorTitle: "Consultation starts in less than 1 hour",
      priority: "critical",
    };
  }

  if (msUntil <= DAY_BEFORE_WINDOW_MS) {
    return {
      key: "dayBeforeSentAt",
      patientType: "appointment_reminder_24h",
      doctorType: "doctor_appointment_reminder_24h",
      patientTitle: "Appointment in less than 24 hours",
      doctorTitle: "Consultation starts within 24 hours",
      priority: "important",
    };
  }

  return null;
};

export const processAppointmentReminders = async ({
  io,
  userId = null,
  role = null,
} = {}) => {
  if (role === "admin") {
    return { processed: 0 };
  }

  const now = new Date();
  const query = {
    doctor: { $ne: null },
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    appointmentDate: {
      $gt: now,
      $lte: new Date(now.getTime() + DAY_BEFORE_WINDOW_MS),
    },
  };

  if (userId && role === "patient") {
    query.patient = userId;
  }

  if (userId && role === "doctor") {
    query.doctor = userId;
  }

  const appointments = await Appointment.find(query)
    .populate("patient", "name")
    .populate("doctor", "name")
    .select(
      "patient doctor appointmentDate appointmentTimezone reminders status",
    )
    .sort({ appointmentDate: 1 })
    .lean();

  let processed = 0;

  for (const appointment of appointments) {
    const msUntil = new Date(appointment.appointmentDate).getTime() - now.getTime();
    const reminder = getReminderDefinition(msUntil);

    if (!reminder) {
      continue;
    }

    if (appointment.reminders?.[reminder.key]) {
      continue;
    }

    const claimedAppointment = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        [`reminders.${reminder.key}`]: null,
      },
      {
        $set: {
          [`reminders.${reminder.key}`]: now,
        },
      },
      {
        new: true,
      },
    )
      .select("_id")
      .lean();

    if (!claimedAppointment) {
      continue;
    }

    const formattedTime = formatAppointmentDateTime(
      appointment.appointmentDate,
      appointment.appointmentTimezone,
    );

    await createNotification({
      io,
      recipientId: appointment.patient?._id || appointment.patient,
      actorId: appointment.doctor?._id || appointment.doctor,
      type: reminder.patientType,
      category: "appointment",
      title: reminder.patientTitle,
      message: `${appointment.doctor?.name || "Your doctor"} is scheduled to see you on ${formattedTime}.`,
      link: "/appointments",
      priority: reminder.priority,
      metadata: {
        appointmentId: appointment._id.toString(),
      },
    });

    if (appointment.doctor?._id || appointment.doctor) {
      await createNotification({
        io,
        recipientId: appointment.doctor?._id || appointment.doctor,
        actorId: appointment.patient?._id || appointment.patient,
        type: reminder.doctorType,
        category: "appointment",
        title: reminder.doctorTitle,
        message: `${appointment.patient?.name || "A patient"} is booked for ${formattedTime}.`,
        link: `/patients/${appointment.patient?._id || appointment.patient}?appointment=${appointment._id}&chat=1`,
        priority: reminder.priority,
        metadata: {
          appointmentId: appointment._id.toString(),
          patientId: appointment.patient?._id?.toString?.() || appointment.patient?.toString?.() || "",
        },
      });
    }

    processed += 1;
  }

  return { processed };
};
