import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import API from "../api/api";
import { getPatientId } from "../auth";

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
  unreadByDoctor: [],
};

export default function useUnreadChats() {
  const patientId = getPatientId();
  const [summary, setSummary] = useState(defaultSummary);

  const refreshUnreadSummary = useCallback(async () => {
    if (!patientId) {
      setSummary(defaultSummary);
      return;
    }

    try {
      const res = await API.get("/chat/unread/summary");

      setSummary({
        totalUnreadConversations: res.data.totalUnreadConversations || 0,
        totalUnreadMessages: res.data.totalUnreadMessages || 0,
        unreadByDoctor: res.data.unreadByDoctor || [],
      });
    } catch (error) {
      console.error("Failed to fetch unread chat summary", error);
    }
  }, [patientId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      refreshUnreadSummary();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshUnreadSummary]);

  useEffect(() => {
    if (!patientId) {
      return undefined;
    }

    const socket = io("http://localhost:5000");
    const handleIncomingMessage = (message) => {
      if (getEntityId(message.receiver) === patientId) {
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
  }, [patientId, refreshUnreadSummary]);

  const unreadCountsByDoctor = useMemo(
    () =>
      Object.fromEntries(
        summary.unreadByDoctor.map((item) => [item.doctorId, item.unreadCount]),
      ),
    [summary.unreadByDoctor],
  );

  return {
    ...summary,
    refreshUnreadSummary,
    unreadCountsByDoctor,
  };
}
