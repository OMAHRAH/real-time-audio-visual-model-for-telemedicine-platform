import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import API from "../api/api";
import { getCurrentUser } from "../auth";
import { SOCKET_URL } from "../config/runtime";

const getEntityId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
  }

  return String(value);
};

const defaultSummary = {
  totalUnreadConversations: 0,
  totalUnreadMessages: 0,
  unreadByPatient: [],
};

export default function useUnreadPatientMessages() {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id || currentUser?._id || "";
  const [summary, setSummary] = useState(defaultSummary);

  const refreshUnreadSummary = useCallback(async () => {
    if (!currentUserId) {
      setSummary(defaultSummary);
      return;
    }

    try {
      const res = await API.get("/chat/unread/summary");

      setSummary({
        totalUnreadConversations: res.data.totalUnreadConversations || 0,
        totalUnreadMessages: res.data.totalUnreadMessages || 0,
        unreadByPatient: res.data.unreadByPatient || [],
      });
    } catch (error) {
      console.error("Failed to fetch unread patient messages", error);
    }
  }, [currentUserId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      refreshUnreadSummary();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshUnreadSummary]);

  useEffect(() => {
    if (!currentUserId) {
      return undefined;
    }

    const socket = io(SOCKET_URL);
    const handleIncomingMessage = (message) => {
      if (getEntityId(message.receiver) === currentUserId) {
        refreshUnreadSummary();
      }
    };
    const handleMessagesRead = () => {
      refreshUnreadSummary();
    };

    socket.on("new-message", handleIncomingMessage);
    socket.on("messages-read", handleMessagesRead);

    return () => {
      socket.off("new-message", handleIncomingMessage);
      socket.off("messages-read", handleMessagesRead);
      socket.disconnect();
    };
  }, [currentUserId, refreshUnreadSummary]);

  const unreadCountsByPatient = useMemo(
    () =>
      Object.fromEntries(
        summary.unreadByPatient.map((item) => [item.patientId, item.unreadCount]),
      ),
    [summary.unreadByPatient],
  );

  return {
    ...summary,
    refreshUnreadSummary,
    unreadCountsByPatient,
  };
}
