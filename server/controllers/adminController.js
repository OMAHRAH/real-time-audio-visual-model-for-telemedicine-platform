import Alert from "../models/Alert.js";
import Appointment from "../models/appointment.js";
import CareAssignment from "../models/CareAssignment.js";
import ChatMessage from "../models/chatMessage.js";
import User from "../models/user.js";
import VitalReading from "../models/VitalReading.js";
import { upsertActiveAssignment } from "../utils/careAssignments.js";
import { createNotification } from "../utils/notifications.js";
import {
  getDoctorStatusSortRank,
  getDoctorWorkloadStatusLabel,
  isDoctorAcceptingNewPatients,
  isDoctorOnlineFromStatus,
  normalizeDoctorWorkloadStatus,
} from "../utils/doctorStatus.js";
import { evaluateSla, SLA_RULES } from "../utils/sla.js";

const isActiveDoctor = (doctor) => Boolean(doctor?._id || doctor);

const getDoctorId = (doctor) => doctor?._id?.toString?.() || doctor?.toString?.() || "";

const sortBySlaPriority = (left, right) => {
  const leftRank = left.sla?.sortRank ?? -1;
  const rightRank = right.sla?.sortRank ?? -1;

  if (rightRank !== leftRank) {
    return rightRank - leftRank;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
};

const getVitalSummary = (vital) => {
  const values = [];

  if (vital.systolic || vital.diastolic) {
    values.push(`BP ${vital.systolic || "-"}/${vital.diastolic || "-"}`);
  }

  if (vital.glucoseLevel) {
    values.push(`Glucose ${vital.glucoseLevel}`);
  }

  return values.join(" | ") || "Critical vital reading";
};

const getAlertRuleSet = (alert) => {
  if (alert.type === "critical_vital") {
    return {
      intake: SLA_RULES.criticalVitalIntake,
      response: SLA_RULES.criticalVitalResponse,
      sourceLabel: "Critical alert",
      urgency: "critical",
    };
  }

  return {
    intake: SLA_RULES.emergencyIntake,
    response: SLA_RULES.emergencyResponse,
    sourceLabel: "Emergency alert",
    urgency: "emergency",
  };
};

const enrichAppointment = (appointment, now) => {
  if (appointment.status !== "pending") {
    return {
      ...appointment,
      sourceType: "appointment",
      sourceLabel: "Appointment request",
      urgency: "routine",
      queueSummary: appointment.reason,
      sla: null,
    };
  }

  const assigned = isActiveDoctor(appointment.doctor);
  const startedAt = assigned ? appointment.routedAt || appointment.createdAt : appointment.createdAt;
  const sla = evaluateSla({
    startedAt,
    rule: assigned ? SLA_RULES.appointmentResponse : SLA_RULES.appointmentIntake,
    now,
  });

  return {
    ...appointment,
    sourceType: "appointment",
    sourceLabel: "Appointment request",
    urgency: "routine",
    queueSummary: appointment.reason,
    sla,
  };
};

const enrichVital = (vital, now) => {
  const assigned = isActiveDoctor(vital.doctor);
  const startedAt = assigned ? vital.routedAt || vital.createdAt : vital.createdAt;
  const sla = evaluateSla({
    startedAt,
    rule: assigned ? SLA_RULES.criticalVitalResponse : SLA_RULES.criticalVitalIntake,
    now,
  });

  return {
    ...vital,
    sourceType: "critical_vital",
    sourceLabel: "Critical vital",
    urgency: "critical",
    queueSummary: getVitalSummary(vital),
    sla,
  };
};

const enrichAlert = (alert, now) => {
  const assigned = isActiveDoctor(alert.doctor);
  const ruleSet = getAlertRuleSet(alert);
  const startedAt = assigned ? alert.routedAt || alert.createdAt : alert.createdAt;
  const sla = evaluateSla({
    startedAt,
    rule: assigned ? ruleSet.response : ruleSet.intake,
    now,
  });

  return {
    ...alert,
    sourceType: "alert",
    sourceLabel: ruleSet.sourceLabel,
    urgency: ruleSet.urgency,
    queueSummary: alert.message,
    sla,
  };
};

const toQueueItem = (item) => ({
  queueId: `${item.sourceType}-${item._id}`,
  itemId: item._id,
  patient: item.patient,
  doctor: item.doctor || null,
  patientId: item.patient?._id || item.patient || null,
  doctorId: item.doctor?._id || item.doctor || null,
  sourceType: item.sourceType,
  sourceLabel: item.sourceLabel,
  urgency: item.urgency,
  summary: item.queueSummary,
  createdAt: item.createdAt,
  routedAt: item.routedAt || null,
  appointmentDate: item.appointmentDate || null,
  preferredDoctor: item.preferredDoctor || null,
  status: item.status,
  sla: item.sla,
});

const getDoctorLoadMaps = ({
  activeAssignments,
  pendingAppointments,
  criticalVitals,
  emergencyAlerts,
  responseQueue,
}) => {
  const activeAssignmentsByDoctor = new Map();
  activeAssignments.forEach((assignment) => {
    const doctorId = assignment.doctor?._id?.toString();

    if (!doctorId) {
      return;
    }

    activeAssignmentsByDoctor.set(
      doctorId,
      (activeAssignmentsByDoctor.get(doctorId) || 0) + 1,
    );
  });

  const pendingAppointmentsByDoctor = new Map();
  pendingAppointments.forEach((appointment) => {
    const doctorId = getDoctorId(appointment.doctor);

    if (!doctorId) {
      return;
    }

    pendingAppointmentsByDoctor.set(
      doctorId,
      (pendingAppointmentsByDoctor.get(doctorId) || 0) + 1,
    );
  });

  const criticalVitalsByDoctor = new Map();
  criticalVitals.forEach((reading) => {
    const doctorId = getDoctorId(reading.doctor);

    if (!doctorId) {
      return;
    }

    criticalVitalsByDoctor.set(
      doctorId,
      (criticalVitalsByDoctor.get(doctorId) || 0) + 1,
    );
  });

  const emergencyAlertsByDoctor = new Map();
  emergencyAlerts.forEach((alert) => {
    const doctorId = getDoctorId(alert.doctor);

    if (!doctorId) {
      return;
    }

    emergencyAlertsByDoctor.set(
      doctorId,
      (emergencyAlertsByDoctor.get(doctorId) || 0) + 1,
    );
  });

  const overdueResponseByDoctor = new Map();
  responseQueue
    .filter((item) =>
      item.sla?.status === "overdue" || item.sla?.status === "escalated",
    )
    .forEach((item) => {
      const doctorId = getDoctorId(item.doctor);

      if (!doctorId) {
        return;
      }

      overdueResponseByDoctor.set(
        doctorId,
        (overdueResponseByDoctor.get(doctorId) || 0) + 1,
      );
    });

  return {
    activeAssignmentsByDoctor,
    pendingAppointmentsByDoctor,
    criticalVitalsByDoctor,
    emergencyAlertsByDoctor,
    overdueResponseByDoctor,
  };
};

const mapDoctorsWithLoad = ({
  doctors,
  activeAssignments,
  pendingAppointments,
  criticalVitals,
  emergencyAlerts,
  responseQueue,
}) => {
  const {
    activeAssignmentsByDoctor,
    pendingAppointmentsByDoctor,
    criticalVitalsByDoctor,
    emergencyAlertsByDoctor,
    overdueResponseByDoctor,
  } = getDoctorLoadMaps({
    doctors,
    activeAssignments,
    pendingAppointments,
    criticalVitals,
    emergencyAlerts,
    responseQueue,
  });

  return doctors
    .map((doctor) => {
      const workloadStatus = normalizeDoctorWorkloadStatus(
        doctor.workloadStatus || "available",
      );

      return {
        ...doctor,
        isOnline: isDoctorOnlineFromStatus(workloadStatus),
        specialty: doctor.specialty || "General Medicine",
        workloadStatus,
        workloadStatusLabel: getDoctorWorkloadStatusLabel(workloadStatus),
        acceptingNewPatients: isDoctorAcceptingNewPatients(workloadStatus),
        statusSortRank: getDoctorStatusSortRank(workloadStatus),
        assignmentCount:
          activeAssignmentsByDoctor.get(doctor._id.toString()) || 0,
        pendingAppointmentCount:
          pendingAppointmentsByDoctor.get(doctor._id.toString()) || 0,
        criticalVitalCount:
          criticalVitalsByDoctor.get(doctor._id.toString()) || 0,
        emergencyAlertCount:
          emergencyAlertsByDoctor.get(doctor._id.toString()) || 0,
        overdueResponseCount:
          overdueResponseByDoctor.get(doctor._id.toString()) || 0,
      };
    })
    .sort((left, right) => {
      const rankDiff = right.statusSortRank - left.statusSortRank;

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return left.name.localeCompare(right.name);
    });
};

const buildSlaSummary = ({ intakeQueue, responseQueue }) => {
  const countByStatus = (items, status) =>
    items.filter((item) => item.sla?.status === status).length;

  return {
    intakeTotal: intakeQueue.length,
    intakeDueSoon: countByStatus(intakeQueue, "due_soon"),
    intakeOverdue: countByStatus(intakeQueue, "overdue"),
    responseTotal: responseQueue.length,
    responseDueSoon: countByStatus(responseQueue, "due_soon"),
    responseOverdue: countByStatus(responseQueue, "overdue"),
    escalatedItems:
      countByStatus(intakeQueue, "escalated") +
      countByStatus(responseQueue, "escalated"),
  };
};

const averageMinutes = (durations) => {
  if (!durations.length) {
    return 0;
  }

  const total = durations.reduce((sum, value) => sum + value, 0);
  return Number((total / durations.length).toFixed(1));
};

const ANALYTICS_TREND_DAYS = 7;

const buildTrendBuckets = (days = ANALYTICS_TREND_DAYS) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));

    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString([], { weekday: "short" }),
      date,
    };
  });
};

const buildAverageTrend = (records) => {
  const buckets = buildTrendBuckets().map((bucket) => ({
    ...bucket,
    total: 0,
    count: 0,
  }));
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  records.forEach((record) => {
    const occurredAt = new Date(record.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || !Number.isFinite(record.minutes)) {
      return;
    }

    const bucket = bucketMap.get(occurredAt.toISOString().slice(0, 10));
    if (!bucket) {
      return;
    }

    bucket.total += record.minutes;
    bucket.count += 1;
  });

  return buckets.map(({ key, label, date, total, count }) => ({
    key,
    label,
    date,
    count,
    value: count ? Number((total / count).toFixed(1)) : 0,
  }));
};

const buildCallRateTrend = (callLogs) => {
  const buckets = buildTrendBuckets().map((bucket) => ({
    ...bucket,
    totalCalls: 0,
    missedCalls: 0,
  }));
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  callLogs.forEach((callLog) => {
    const createdAt = new Date(callLog.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return;
    }

    const bucket = bucketMap.get(createdAt.toISOString().slice(0, 10));
    if (!bucket) {
      return;
    }

    bucket.totalCalls += 1;
    if (callLog.callDetails?.status === "missed") {
      bucket.missedCalls += 1;
    }
  });

  return buckets.map(({ key, label, date, totalCalls, missedCalls }) => ({
    key,
    label,
    date,
    totalCalls,
    missedCalls,
    value: totalCalls
      ? Number(((missedCalls / totalCalls) * 100).toFixed(1))
      : 0,
  }));
};

const buildChatResponseRecords = (messages) => {
  const pendingByConversation = new Map();
  const responseRecords = [];

  messages.forEach((message) => {
    const patientId = message.patient?.toString?.() || "";
    const senderId = message.sender?.toString?.() || "";
    const receiverId = message.receiver?.toString?.() || "";
    const counterpartId = senderId === patientId ? receiverId : senderId;
    const conversationKey = `${patientId}:${counterpartId}`;
    const messageTime = new Date(message.createdAt).getTime();

    if (!patientId || !counterpartId || !Number.isFinite(messageTime)) {
      return;
    }

    if (senderId === patientId) {
      if (!pendingByConversation.has(conversationKey)) {
        pendingByConversation.set(conversationKey, messageTime);
      }
      return;
    }

    const waitingSince = pendingByConversation.get(conversationKey);

    if (waitingSince) {
      responseRecords.push({
        minutes: (messageTime - waitingSince) / (1000 * 60),
        occurredAt: message.createdAt,
      });
      pendingByConversation.delete(conversationKey);
    }
  });

  return responseRecords;
};

const buildAnalyticsSnapshot = async () => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [
    routedAppointments,
    routedVitals,
    routedAlerts,
    reviewedVitals,
    resolvedAlerts,
    callLogs,
    chatMessages,
  ] = await Promise.all([
    Appointment.find({
      routedAt: { $ne: null },
      createdAt: { $gte: since },
    })
      .select("createdAt routedAt")
      .lean(),
    VitalReading.find({
      routedAt: { $ne: null },
      createdAt: { $gte: since },
    })
      .select("createdAt routedAt")
      .lean(),
    Alert.find({
      routedAt: { $ne: null },
      createdAt: { $gte: since },
    })
      .select("createdAt routedAt type")
      .lean(),
    VitalReading.find({
      reviewedAt: { $ne: null },
      createdAt: { $gte: since },
    })
      .select("createdAt reviewedAt")
      .lean(),
    Alert.find({
      type: "emergency",
      resolvedAt: { $ne: null },
      createdAt: { $gte: since },
    })
      .select("createdAt resolvedAt")
      .lean(),
    ChatMessage.find({
      type: "call_log",
      createdAt: { $gte: since },
    })
      .select("callDetails createdAt")
      .lean(),
    ChatMessage.find({
      type: { $in: ["text", "file", "image", "audio"] },
      createdAt: { $gte: since },
    })
      .select("patient sender receiver createdAt")
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const assignmentRecords = [
    ...routedAppointments.map((item) => ({
      minutes:
        (new Date(item.routedAt) - new Date(item.createdAt)) / (1000 * 60),
      occurredAt: item.routedAt,
    })),
    ...routedVitals.map((item) => ({
      minutes:
        (new Date(item.routedAt) - new Date(item.createdAt)) / (1000 * 60),
      occurredAt: item.routedAt,
    })),
    ...routedAlerts.map((item) => ({
      minutes:
        (new Date(item.routedAt) - new Date(item.createdAt)) / (1000 * 60),
      occurredAt: item.routedAt,
    })),
  ].filter(
    (record) => Number.isFinite(record.minutes) && record.minutes >= 0,
  );

  const alertReviewRecords = [
    ...reviewedVitals.map((item) => ({
      minutes:
        (new Date(item.reviewedAt) - new Date(item.createdAt)) / (1000 * 60),
      occurredAt: item.reviewedAt,
    })),
    ...resolvedAlerts.map((item) => ({
      minutes:
        (new Date(item.resolvedAt) - new Date(item.createdAt)) / (1000 * 60),
      occurredAt: item.resolvedAt,
    })),
  ].filter(
    (record) => Number.isFinite(record.minutes) && record.minutes >= 0,
  );

  const responseRecords = buildChatResponseRecords(chatMessages).filter(
    (record) => Number.isFinite(record.minutes) && record.minutes >= 0,
  );
  const assignmentDurations = assignmentRecords.map((record) => record.minutes);
  const alertReviewDurations = alertReviewRecords.map(
    (record) => record.minutes,
  );
  const responseDurations = responseRecords.map((record) => record.minutes);
  const missedCalls = callLogs.filter(
    (log) => log.callDetails?.status === "missed",
  ).length;
  const totalCalls = callLogs.length;

  return {
    windowDays: 30,
    avgAssignmentTimeMinutes: averageMinutes(assignmentDurations),
    avgResponseTimeMinutes: averageMinutes(responseDurations),
    avgAlertReviewTimeMinutes: averageMinutes(alertReviewDurations),
    missedCallRate: totalCalls
      ? Number(((missedCalls / totalCalls) * 100).toFixed(1))
      : 0,
    totalCalls,
    missedCalls,
    totalAssignmentsMeasured: assignmentDurations.length,
    totalResponsesMeasured: responseDurations.length,
    totalAlertReviewsMeasured: alertReviewDurations.length,
    trends: {
      assignmentTime: buildAverageTrend(assignmentRecords),
      responseTime: buildAverageTrend(responseRecords),
      alertReviewTime: buildAverageTrend(alertReviewRecords),
      missedCallRate: buildCallRateTrend(callLogs),
    },
  };
};

const normalizeHospitalNumberInput = (value) =>
  typeof value === "string"
    ? value.trim().toUpperCase().replace(/\s+/g, "-")
    : "";

const generateHospitalNumber = async () => {
  let sequence = (await User.countDocuments({ role: "patient" })) + 1;

  while (sequence < 10000000) {
    const candidate = `HSP-${String(sequence).padStart(6, "0")}`;
    const existingPatient = await User.exists({ hospitalNumber: candidate });

    if (!existingPatient) {
      return candidate;
    }

    sequence += 1;
  }

  throw new Error("Unable to generate a unique hospital number");
};

export const getAdminDashboard = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only." });
    }

    const now = new Date();
    const [
      patients,
      doctors,
      activeAssignments,
      pendingAppointments,
      criticalVitals,
      emergencyAlerts,
    ] = await Promise.all([
      User.find({ role: "patient" })
        .select("name email hospitalNumber createdAt medicalProfile timezone")
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ role: "doctor" })
        .select("name email specialty isOnline workloadStatus createdAt")
        .lean(),
      CareAssignment.find({ status: "active" })
        .populate("patient", "name email hospitalNumber")
        .populate("doctor", "name email specialty isOnline")
        .sort({ updatedAt: -1 })
        .lean(),
      Appointment.find({ status: "pending" })
        .populate("patient", "name email hospitalNumber")
        .populate("doctor", "name email specialty isOnline")
        .populate("preferredDoctor", "name email specialty isOnline")
        .sort({ createdAt: 1 })
        .lean(),
      VitalReading.find({
        flagged: true,
        reviewedByDoctor: false,
      })
        .populate("patient", "name email hospitalNumber")
        .populate("doctor", "name email specialty isOnline")
        .sort({ createdAt: 1 })
        .lean(),
      Alert.find({ status: "active" })
        .populate("patient", "name email hospitalNumber")
        .populate("doctor", "name email specialty isOnline")
        .populate("triageAdmin", "name email role isOnline")
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    const enrichedPendingAppointments = pendingAppointments
      .map((appointment) => enrichAppointment(appointment, now))
      .sort(sortBySlaPriority);

    const enrichedCriticalVitals = criticalVitals
      .map((vital) => enrichVital(vital, now))
      .sort(sortBySlaPriority);

    const enrichedEmergencyAlerts = emergencyAlerts
      .map((alert) => enrichAlert(alert, now))
      .sort(sortBySlaPriority);

    const intakeQueue = [
      ...enrichedPendingAppointments.filter((appointment) => !isActiveDoctor(appointment.doctor)),
      ...enrichedCriticalVitals.filter((vital) => !isActiveDoctor(vital.doctor)),
      ...enrichedEmergencyAlerts.filter((alert) => !isActiveDoctor(alert.doctor)),
    ]
      .map(toQueueItem)
      .sort(sortBySlaPriority);

    const responseQueue = [
      ...enrichedPendingAppointments.filter((appointment) => isActiveDoctor(appointment.doctor)),
      ...enrichedCriticalVitals.filter((vital) => isActiveDoctor(vital.doctor)),
      ...enrichedEmergencyAlerts.filter((alert) => isActiveDoctor(alert.doctor)),
    ]
      .map(toQueueItem)
      .sort(sortBySlaPriority);

    const queuedPatientIds = new Set(
      intakeQueue.map((item) => item.patientId?.toString?.()).filter(Boolean),
    );

    const unassignedPatients = patients.filter((patient) =>
      queuedPatientIds.has(patient._id.toString()),
    );
    const analytics = await buildAnalyticsSnapshot();

    res.json({
      metrics: {
        totalPatients: patients.length,
        totalDoctors: doctors.length,
        onlineDoctors: doctors.filter((doctor) =>
          isDoctorOnlineFromStatus(doctor.workloadStatus || "available"),
        ).length,
        activeAssignments: activeAssignments.length,
        unassignedPatients: unassignedPatients.length,
        pendingAppointments: enrichedPendingAppointments.length,
        criticalVitals: enrichedCriticalVitals.length,
        activeEmergencyAlerts: enrichedEmergencyAlerts.length,
      },
      slaSummary: buildSlaSummary({ intakeQueue, responseQueue }),
      doctors: mapDoctorsWithLoad({
        doctors,
        activeAssignments,
        pendingAppointments: enrichedPendingAppointments,
        criticalVitals: enrichedCriticalVitals,
        emergencyAlerts: enrichedEmergencyAlerts,
        responseQueue,
      }),
      activeAssignments,
      unassignedPatients,
      intakeQueue,
      responseQueue,
      pendingAppointments: enrichedPendingAppointments,
      criticalVitals: enrichedCriticalVitals,
      emergencyAlerts: enrichedEmergencyAlerts,
      analytics,
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

    const routedAt = new Date();
    const hadTriageEmergency = await Alert.exists({
      patient: patientId,
      type: "emergency",
      status: "active",
      doctor: null,
    });

    await Promise.all([
      Appointment.updateMany(
        {
          patient: patientId,
          status: { $in: ["pending", "approved"] },
        },
        {
          $set: { doctor: doctorId, routedAt },
        },
      ),
      VitalReading.updateMany(
        {
          patient: patientId,
          reviewedByDoctor: false,
        },
        {
          $set: { doctor: doctorId, routedAt },
        },
      ),
      Alert.updateMany(
        {
          patient: patientId,
          status: "active",
        },
        {
          $set: { doctor: doctorId, routedAt },
        },
      ),
    ]);

    if (req.io && hadTriageEmergency) {
      req.io.emit("emergency-routed", {
        patientId,
        doctorId,
        routedAt,
      });
    }

    await createNotification({
      io: req.io,
      recipientId: doctorId,
      actorId: req.user.id,
      type: "patient_routed",
      category: "routing",
      title: "Patient routed to you",
      message: `${patient.name} was routed into your care queue.`,
      link: `/patients/${patientId}?chat=1`,
      priority: hadTriageEmergency ? "critical" : "important",
      metadata: {
        patientId: patientId.toString(),
        doctorId: doctorId.toString(),
      },
    });

    await createNotification({
      io: req.io,
      recipientId: patientId,
      actorId: req.user.id,
      type: hadTriageEmergency ? "emergency_routed" : "care_routed",
      category: hadTriageEmergency ? "emergency" : "routing",
      title: hadTriageEmergency
        ? "Emergency handed to a doctor"
        : "Doctor assigned",
      message: hadTriageEmergency
        ? `${doctor.name} is now handling your emergency case.`
        : `${doctor.name} has been assigned to your care.`,
      link: "/chat",
      priority: hadTriageEmergency ? "critical" : "important",
      metadata: {
        patientId: patientId.toString(),
        doctorId: doctorId.toString(),
      },
    });

    const populatedAssignment = await CareAssignment.findById(assignment._id)
      .populate("patient", "name email hospitalNumber")
      .populate("doctor", "name email specialty isOnline workloadStatus")
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

export const assignPatientHospitalNumber = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only." });
    }

    const patient = await User.findOne({
      _id: req.params.id,
      role: "patient",
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const requestedHospitalNumber = normalizeHospitalNumberInput(
      req.body.hospitalNumber,
    );
    const hospitalNumber =
      requestedHospitalNumber || (await generateHospitalNumber());

    const existingPatient = await User.findOne({
      _id: { $ne: patient._id },
      hospitalNumber,
    })
      .select("_id")
      .lean();

    if (existingPatient) {
      return res.status(400).json({
        message: "Hospital number already exists. Choose another one.",
      });
    }

    patient.hospitalNumber = hospitalNumber;
    await patient.save();

    res.json({
      message: "Hospital number assigned",
      patient: {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        hospitalNumber: patient.hospitalNumber,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error assigning hospital number",
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
    const now = new Date();

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
      emergencyAlerts,
    ] = await Promise.all([
      User.findOne({ _id: patientId, role: "patient" })
        .select("name email hospitalNumber createdAt medicalProfile timezone")
        .lean(),
      VitalReading.find({ patient: patientId })
        .populate("patient", "name email hospitalNumber")
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
        .populate("triageAdmin", "name email role isOnline")
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ role: "doctor" })
        .select("name email specialty isOnline workloadStatus createdAt")
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
      Alert.find({ status: "active" })
        .populate("doctor", "name email specialty isOnline")
        .populate("triageAdmin", "name email role isOnline")
        .lean(),
    ]);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const enrichedPendingAppointments = pendingAppointments.map((appointment) =>
      enrichAppointment(appointment, now),
    );
    const enrichedCriticalVitals = criticalVitals.map((vital) =>
      enrichVital(vital, now),
    );
    const enrichedEmergencyAlerts = emergencyAlerts.map((alert) =>
      enrichAlert(alert, now),
    );
    const responseQueue = [
      ...enrichedPendingAppointments.filter((appointment) =>
        isActiveDoctor(appointment.doctor),
      ),
      ...enrichedCriticalVitals.filter((vital) => isActiveDoctor(vital.doctor)),
      ...enrichedEmergencyAlerts.filter((alert) => isActiveDoctor(alert.doctor)),
    ].map(toQueueItem);

    const availableDoctors = mapDoctorsWithLoad({
      doctors,
      activeAssignments,
      pendingAppointments: enrichedPendingAppointments,
      criticalVitals: enrichedCriticalVitals,
      emergencyAlerts: enrichedEmergencyAlerts,
      responseQueue,
    });

    res.json({
      patient,
      vitals: vitals.map((vital) =>
        vital.flagged && !vital.reviewedByDoctor
          ? enrichVital(vital, now)
          : { ...vital, sourceType: "critical_vital", queueSummary: getVitalSummary(vital), sla: null }
      ),
      appointments: appointments.map((appointment) =>
        appointment.status === "pending"
          ? enrichAppointment(appointment, now)
          : { ...appointment, sourceType: "appointment", queueSummary: appointment.reason, sla: null }
      ),
      activeAssignment,
      assignmentHistory,
      alerts: alerts.map((alert) =>
        alert.status === "active"
          ? enrichAlert(alert, now)
          : { ...alert, sourceType: "alert", queueSummary: alert.message, sla: null }
      ),
      doctors: availableDoctors,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error loading admin patient profile",
      error: error.message,
    });
  }
};
