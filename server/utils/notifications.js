import Notification from "../models/Notification.js";
import User from "../models/user.js";

export const buildNotificationUserRoomId = (userId) => `user:${userId}`;

const populateNotification = (query) =>
  query
    .populate("actor", "name role email specialty workloadStatus isOnline")
    .populate(
      "recipient",
      "name role email specialty workloadStatus isOnline",
    );

const emitNotificationUpdate = (io, recipientId, eventName, payload = {}) => {
  if (!io || !recipientId) {
    return;
  }

  io.to(buildNotificationUserRoomId(recipientId.toString())).emit(eventName, {
    recipientId: recipientId.toString(),
    ...payload,
  });
};

export const createNotification = async ({
  io,
  recipientId,
  actorId = null,
  type,
  category = "system",
  title,
  message,
  link = "",
  priority = "normal",
  metadata = {},
}) => {
  if (!recipientId || !type || !title || !message) {
    return null;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    actor: actorId,
    type,
    category,
    title,
    message,
    link,
    priority,
    metadata,
  });

  const populatedNotification = await populateNotification(
    Notification.findById(notification._id),
  )
    .lean()
    .exec();

  emitNotificationUpdate(io, recipientId, "notification:new", {
    notification: populatedNotification,
  });

  return populatedNotification;
};

export const createNotifications = async ({
  io,
  recipientIds,
  actorId = null,
  type,
  category = "system",
  title,
  message,
  link = "",
  priority = "normal",
  metadata = {},
}) => {
  const uniqueRecipientIds = Array.from(
    new Set(
      (recipientIds || [])
        .map((recipientId) => recipientId?.toString?.() || recipientId)
        .filter(Boolean),
    ),
  );

  if (uniqueRecipientIds.length === 0) {
    return [];
  }

  return Promise.all(
    uniqueRecipientIds.map((recipientId) =>
      createNotification({
        io,
        recipientId,
        actorId,
        type,
        category,
        title,
        message,
        link,
        priority,
        metadata,
      }),
    ),
  );
};

export const markNotificationsRead = async ({
  io,
  recipientId,
  extraQuery = {},
}) => {
  if (!recipientId) {
    return { modifiedCount: 0, readAt: null };
  }

  const readAt = new Date();
  const updateResult = await Notification.updateMany(
    {
      recipient: recipientId,
      readAt: null,
      ...extraQuery,
    },
    {
      $set: { readAt },
    },
  );

  if (updateResult.modifiedCount > 0) {
    emitNotificationUpdate(io, recipientId, "notification:updated", {
      modifiedCount: updateResult.modifiedCount,
      readAt,
    });
  }

  return {
    modifiedCount: updateResult.modifiedCount,
    readAt,
  };
};

export const getAdminRecipientIds = async () => {
  const admins = await User.find({ role: "admin" }).select("_id").lean();
  return admins.map((admin) => admin._id.toString());
};
