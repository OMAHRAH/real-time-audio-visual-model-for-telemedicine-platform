import Alert from "../models/Alert.js";
import User from "../models/user.js";
import {
  createNotification,
  createNotifications,
  getAdminRecipientIds,
} from "../utils/notifications.js";

const findEmergencyTriageAdmin = async () => {
  const onlineAdmin = await User.findOne({
    role: "admin",
    isOnline: { $ne: false },
  })
    .sort({ createdAt: 1 })
    .lean();

  if (onlineAdmin) {
    return onlineAdmin;
  }

  return User.findOne({ role: "admin" }).sort({ createdAt: 1 }).lean();
};

const populateAlertQuery = (query) =>
  query
      .populate("patient", "name email hospitalNumber")
    .populate("doctor", "name email specialty isOnline")
    .populate("triageAdmin", "name email role isOnline")
    .populate("resolvedBy", "name email role");

export const getAlerts = async (req, res) => {
  try {
    const query = {};

    if (req.user?.role === "doctor") {
      query.doctor = req.user.id;
    }

    if (req.user?.role === "admin") {
      query.triageAdmin = req.user.id;
    }

    if (req.user?.role === "patient") {
      query.patient = req.user.id;
    }

    const alerts = await populateAlertQuery(
      Alert.find(query).sort({ createdAt: -1 }),
    );

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getActiveEmergencyAlert = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        message: "Only patients can view their active emergency contact",
      });
    }

    const activeEmergency = await populateAlertQuery(
      Alert.findOne({
        patient: req.user.id,
        type: "emergency",
        status: "active",
      }).sort({ createdAt: -1 }),
    );

    if (!activeEmergency) {
      return res.json({ alert: null, activeContact: null });
    }

    const activeContact =
      activeEmergency.doctor ||
      (activeEmergency.triageAdmin && !activeEmergency.doctor
        ? activeEmergency.triageAdmin
        : null);

    res.json({
      alert: activeEmergency,
      activeContact,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error loading active emergency alert",
      error: error.message,
    });
  }
};

export const createEmergencyAlert = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Only patients can send emergency alerts" });
    }

    const payload = req.body || {};

    const existingActiveEmergency = await populateAlertQuery(
      Alert.findOne({
        patient: req.user.id,
        type: "emergency",
        status: "active",
      }).sort({ createdAt: -1 }),
    );

    if (existingActiveEmergency) {
      const activeContact =
        existingActiveEmergency.doctor ||
        existingActiveEmergency.triageAdmin ||
        null;

      return res.status(200).json({
        message: activeContact?._id
          ? "An emergency case is already active. Continue in the emergency chat."
          : "An emergency case is already active and is waiting for admin review.",
        alert: existingActiveEmergency,
        activeContact,
      });
    }

    const triageAdmin = await findEmergencyTriageAdmin();

    const alert = await Alert.create({
      patient: req.user.id,
      doctor: null,
      triageAdmin: triageAdmin?._id || null,
      message:
        payload.message ||
        "Emergency assistance requested by patient. Please respond immediately.",
      type: "emergency",
      status: "active",
      routedAt: null,
    });

    const populatedAlert = await populateAlertQuery(Alert.findById(alert._id));
    const triageAdminId = populatedAlert.triageAdmin?._id?.toString() || "";

    if (req.io) {
      req.io.emit("emergencyAlert", populatedAlert);
    }

    await createNotification({
      io: req.io,
      recipientId: req.user.id,
      actorId: req.user.id,
      type: "emergency_submitted",
      category: "emergency",
      title: "Emergency request submitted",
      message: triageAdminId
        ? "An admin is now triaging your emergency request."
        : "Your emergency request is waiting for an available admin.",
      link: "/chat",
      priority: "critical",
      metadata: {
        alertId: alert._id.toString(),
        patientId: req.user.id.toString(),
      },
    });

    if (triageAdminId) {
      await createNotification({
        io: req.io,
        recipientId: triageAdminId,
        actorId: req.user.id,
        type: "emergency_triage_requested",
        category: "emergency",
        title: "Emergency triage requested",
        message: "A patient needs urgent admin triage.",
        link: `/admin/patients/${req.user.id}`,
        priority: "critical",
        metadata: {
          alertId: alert._id.toString(),
          patientId: req.user.id.toString(),
        },
      });
    } else {
      const adminRecipientIds = await getAdminRecipientIds();
      await createNotifications({
        io: req.io,
        recipientIds: adminRecipientIds,
        actorId: req.user.id,
        type: "emergency_triage_requested",
        category: "emergency",
        title: "Emergency triage requested",
        message: "A patient needs urgent admin triage.",
        link: `/admin/patients/${req.user.id}`,
        priority: "critical",
        metadata: {
          alertId: alert._id.toString(),
          patientId: req.user.id.toString(),
        },
      });
    }

    res.status(201).json({
      message: triageAdmin?._id
        ? "Emergency alert sent to admin triage. Open the emergency chat now."
        : "Emergency alert sent and is waiting for an available admin.",
      alert: populatedAlert,
      activeContact: populatedAlert.triageAdmin || null,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error sending emergency alert",
      error: error.message,
    });
  }
};

export const resolveEmergencyAlert = async (req, res) => {
  try {
    if (!["admin", "doctor"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only admins or the assigned doctor can close emergency cases",
      });
    }

    const alert = await populateAlertQuery(
      Alert.findOne({
        _id: req.params.id,
        type: "emergency",
      }),
    );

    if (!alert) {
      return res.status(404).json({ message: "Emergency alert not found" });
    }

    if (alert.status !== "active") {
      return res.status(400).json({
        message: "This emergency case has already been closed",
      });
    }

    if (req.user.role === "admin") {
      if (alert.doctor) {
        return res.status(409).json({
          message:
            "This emergency case has already been routed to a doctor and cannot be closed from admin triage",
        });
      }

      if (
        alert.triageAdmin &&
        alert.triageAdmin._id?.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({
          message: "This emergency case is assigned to another admin",
        });
      }
    }

    if (req.user.role === "doctor") {
      if (!alert.doctor) {
        return res.status(409).json({
          message: "This emergency case has not been routed to a doctor yet",
        });
      }

      if (alert.doctor._id?.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          message: "This emergency case is assigned to another doctor",
        });
      }
    }

    alert.status = "resolved";
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.user.id;
    alert.resolutionNote =
      req.body?.resolutionNote?.trim() ||
      (req.user.role === "admin"
        ? "Resolved by admin after triage assessment."
        : "Resolved by assigned doctor after reviewing the emergency case.");

    await alert.save();

    const resolvedAlert = await populateAlertQuery(Alert.findById(alert._id));

    if (req.io) {
      req.io.emit("emergency-resolved", {
        alertId: resolvedAlert._id,
        patientId: resolvedAlert.patient?._id || resolvedAlert.patient,
        resolvedAt: resolvedAlert.resolvedAt,
        resolvedBy: resolvedAlert.resolvedBy?._id || req.user.id,
      });
    }

    await createNotification({
      io: req.io,
      recipientId: resolvedAlert.patient?._id || resolvedAlert.patient,
      actorId: req.user.id,
      type: "emergency_resolved",
      category: "emergency",
      title: "Emergency case closed",
      message:
        req.user.role === "admin"
          ? "Admin triage closed your emergency case."
          : "Your assigned doctor closed the emergency case after review.",
      link: req.user.role === "admin" ? "/chat" : "/appointments",
      priority: "important",
      metadata: {
        alertId: resolvedAlert._id.toString(),
        patientId:
          resolvedAlert.patient?._id?.toString() ||
          resolvedAlert.patient?.toString?.(),
      },
    });

    res.json({
      message:
        req.user.role === "admin"
          ? "Emergency case closed without doctor handoff"
          : "Emergency case marked attended by the assigned doctor",
      alert: resolvedAlert,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error resolving emergency alert",
      error: error.message,
    });
  }
};
