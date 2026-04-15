import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import API from "../api/api";
import { getStoredUser } from "../auth";
import { SOCKET_URL } from "../config/runtime";

const defaultSummary = {
  unreadCount: 0,
};

export default function useNotificationSummary() {
  const currentUser = getStoredUser();
  const currentUserId = currentUser?.id || currentUser?._id || "";
  const [summary, setSummary] = useState(defaultSummary);

  const refreshNotificationSummary = useCallback(async () => {
    if (!currentUserId) {
      setSummary(defaultSummary);
      return;
    }

    try {
      const res = await API.get("/notifications/summary");
      setSummary({
        unreadCount: res.data.unreadCount || 0,
      });
    } catch (error) {
      console.error("Failed to fetch notification summary", error);
    }
  }, [currentUserId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      refreshNotificationSummary();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshNotificationSummary]);

  useEffect(() => {
    if (!currentUserId) {
      return undefined;
    }

    const socket = io(SOCKET_URL);
    const refresh = () => {
      refreshNotificationSummary();
    };

    socket.on("connect", () => {
      socket.emit("notifications:join-user", { userId: currentUserId });
    });
    socket.on("notification:new", refresh);
    socket.on("notification:updated", refresh);

    return () => {
      socket.emit("notifications:leave-user", { userId: currentUserId });
      socket.off("notification:new", refresh);
      socket.off("notification:updated", refresh);
      socket.disconnect();
    };
  }, [currentUserId, refreshNotificationSummary]);

  return {
    ...summary,
    refreshNotificationSummary,
  };
}
