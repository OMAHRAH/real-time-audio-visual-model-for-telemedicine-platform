import Notification from "../models/Notification.js";
import { processAppointmentReminders } from "../utils/appointmentReminders.js";
import { markNotificationsRead } from "../utils/notifications.js";

const populateNotification = (query) =>
  query
    .populate("actor", "name role email specialty workloadStatus isOnline")
    .populate(
      "recipient",
      "name role email specialty workloadStatus isOnline",
    );

export const getNotifications = async (req, res) => {
  try {
    await processAppointmentReminders({
      io: req.io,
      userId: req.user.id,
      role: req.user.role,
    });

    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
    const unreadOnly = req.query.unread === "true";
    const query = {
      recipient: req.user.id,
    };

    if (unreadOnly) {
      query.readAt = null;
    }

    const [notifications, unreadCount] = await Promise.all([
      populateNotification(
        Notification.find(query).sort({ createdAt: -1 }).limit(limit),
      )
        .lean()
        .exec(),
      Notification.countDocuments({
        recipient: req.user.id,
        readAt: null,
      }),
    ]);

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

export const getNotificationSummary = async (req, res) => {
  try {
    await processAppointmentReminders({
      io: req.io,
      userId: req.user.id,
      role: req.user.role,
    });

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      readAt: null,
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching notification summary",
      error: error.message,
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
      req.io
        ?.to(`user:${req.user.id}`)
        .emit("notification:updated", { recipientId: req.user.id });
    }

    res.json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating notification",
      error: error.message,
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await markNotificationsRead({
      io: req.io,
      recipientId: req.user.id,
    });

    res.json({
      message: "Notifications marked as read",
      modifiedCount: result.modifiedCount,
      readAt: result.readAt,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error marking notifications as read",
      error: error.message,
    });
  }
};
