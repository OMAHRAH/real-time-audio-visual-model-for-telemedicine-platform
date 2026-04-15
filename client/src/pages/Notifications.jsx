import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import DoctorShell from "../components/DoctorShell";

const priorityClasses = {
  critical: "bg-red-100 text-red-700",
  important: "bg-amber-100 text-amber-700",
  normal: "bg-slate-100 text-slate-600",
};

const getNotificationCardClassName = (notification) =>
  notification.readAt
    ? "border-slate-200 bg-white"
    : "border-blue-100 bg-blue-50";

const getNotificationActionClassName = (notification) =>
  notification.readAt
    ? "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    : "inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-slate-50";

function formatDateTime(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    setWorking(true);

    try {
      await API.patch("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    } finally {
      setWorking(false);
    }
  };

  const markOneAsRead = async (notificationId) => {
    try {
      await API.patch(`/notifications/${notificationId}/read`);
      const readAt = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, readAt }
            : notification,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  return (
    <DoctorShell
      title="Notifications"
      subtitle="Track routing, appointments, chats, and clinical updates in one queue."
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-blue-600">
              Inbox
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Notification center
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {unreadCount > 0
                ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"} need attention.`
                : "Everything is up to date."}
            </p>
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={working || unreadCount === 0}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {working ? "Updating..." : "Mark all as read"}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <p className="text-base font-medium text-slate-700">
              No notifications yet.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              New chat replies, routing events, and visit updates will appear
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`rounded-3xl border p-4 sm:p-5 ${getNotificationCardClassName(
                  notification,
                )}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-slate-950">
                        {notification.title}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          priorityClasses[notification.priority] ||
                          priorityClasses.normal
                        }`}
                      >
                        {notification.priority || "normal"}
                      </span>
                      {!notification.readAt && (
                        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{notification.category}</span>
                      <span>{formatDateTime(notification.createdAt)}</span>
                      {notification.actor?.name ? (
                        <span>From {notification.actor.name}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {notification.link ? (
                      <Link
                        to={notification.link}
                        onClick={() => {
                          if (!notification.readAt) {
                            markOneAsRead(notification._id);
                          }
                        }}
                        className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        Open
                      </Link>
                    ) : null}

                    {!notification.readAt ? (
                      <button
                        type="button"
                        onClick={() => markOneAsRead(notification._id)}
                        className={getNotificationActionClassName(notification)}
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DoctorShell>
  );
}
