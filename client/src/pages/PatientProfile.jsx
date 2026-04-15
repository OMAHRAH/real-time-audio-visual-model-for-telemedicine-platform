import { useParams, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import API from "../api/api";
import ConversationCallPanel from "../components/ConversationCallPanel";
import DoctorShell from "../components/DoctorShell";
import PatientRecordPanel from "../components/PatientRecordPanel";
import { io } from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getAuthToken, getCurrentUser } from "../auth";
import { SOCKET_URL, resolveServerUrl } from "../config/runtime";
import useConversationCall from "../hooks/useConversationCall";

const socket = io(SOCKET_URL, { autoConnect: false });
const CHAT_FILE_ACCEPT =
  ".doc,.docx,.pdf,.txt,image/png,image/jpeg,image/webp,image/gif,audio/*";
const surfaceClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";

const buildConversationRoomId = (patientId, doctorId) =>
  patientId && doctorId ? `conversation:${patientId}:${doctorId}` : "";

const getEntityId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
  }

  return String(value);
};

const appendMessageIfMissing = (currentMessages, incomingMessage) => {
  if (
    currentMessages.some(
      (existingMessage) => existingMessage._id === incomingMessage._id,
    )
  ) {
    return currentMessages;
  }

  return [...currentMessages, incomingMessage];
};

const isCallLogMessage = (message) => message?.type === "call_log";

const formatCallDuration = (value) => {
  const totalSeconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const segments =
    hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return segments.map((segment) => String(segment).padStart(2, "0")).join(":");
};

const getCallLogTitle = (message) => {
  const modeLabel = message?.callDetails?.mode === "video" ? "Video" : "Voice";

  switch (message?.callDetails?.status) {
    case "completed":
      return `${modeLabel} call ended`;
    case "missed":
      return `Missed ${modeLabel.toLowerCase()} call`;
    case "declined":
      return `${modeLabel} call declined`;
    case "canceled":
      return `${modeLabel} call canceled`;
    default:
      return message?.message || `${modeLabel} call`;
  }
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "PT";

const getActiveAdminTriageEmergency = (alerts, patientId) =>
  alerts.find(
    (alert) =>
      alert?.type === "emergency" &&
      alert?.status === "active" &&
      getEntityId(alert.patient) === patientId &&
      !getEntityId(alert.doctor),
  ) || null;

function AttachIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.48l9.2-9.2a4 4 0 1 1 5.65 5.66l-9.2 9.19a2 2 0 1 1-2.82-2.83l8.48-8.48" />
    </svg>
  );
}

function MicIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </svg>
  );
}

function StopIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

function DownloadIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PhoneCallIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72l.34 2.74a2 2 0 0 1-.57 1.68l-1.2 1.2a16 16 0 0 0 7.16 7.16l1.2-1.2a2 2 0 0 1 1.68-.57l2.74.34A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function VideoCallIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m23 7-7 5 7 5V7Z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

const getCurrentUserId = () => {
  const token = getAuthToken();

  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id;
  } catch {
    return null;
  }
};

function PatientProfile() {
  const { id } = useParams();
  const currentUser = getCurrentUser();
  const currentUserId = getCurrentUserId();
  const isAdminUser = currentUser?.role === "admin";
  const canManageAppointments = currentUser?.role === "doctor";
  const [searchParams] = useSearchParams();
  const chatRef = useRef(null);
  const shouldOpenChat = searchParams.get("chat") === "1";
  const highlightedAppointmentId = searchParams.get("appointment");
  const highlightedAlertId = searchParams.get("alert");

  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [messages, setMessages] = useState([]);
  const [highlightedAlert, setHighlightedAlert] = useState(null);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [chatFeedback, setChatFeedback] = useState("");
  const [attachedAudioPreviewUrl, setAttachedAudioPreviewUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparingVoiceNote, setIsPreparingVoiceNote] = useState(false);
  const [downloadedAudioUrls, setDownloadedAudioUrls] = useState({});
  const [downloadingAudioIds, setDownloadingAudioIds] = useState({});
  const [isRecordDrawerOpen, setIsRecordDrawerOpen] = useState(false);
  const [isResolvingEmergency, setIsResolvingEmergency] = useState(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const downloadedAudioUrlsRef = useRef({});

  const [expandedAppointment, setExpandedAppointment] = useState(
    highlightedAppointmentId || null,
  );

  const [showSaveToast, setShowSaveToast] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState(null);
  const savedNoteId = savedRecordId;

  const [latestVital, setLatestVital] = useState(null);

  const [timeline, setTimeline] = useState([]);

  const [timelineLimit, setTimelineLimit] = useState(4);
  const highlightedAppointment =
    appointments.find((appointment) => appointment._id === highlightedAppointmentId) ||
    null;
  const conversationRoomId = buildConversationRoomId(id, currentUserId);
  const patientInitials = getInitials(patient?.name);
  const showLegacyRecordMarkup = currentUserId === "__legacy__";

  const getRiskLevel = () => {
    if (!latestVital) return "Unknown";

    if (
      latestVital.systolic > 160 ||
      latestVital.diastolic > 100 ||
      latestVital.glucoseLevel > 180
    ) {
      return "High";
    }

    if (
      latestVital.systolic > 140 ||
      latestVital.diastolic > 90 ||
      latestVital.glucoseLevel > 150
    ) {
      return "Monitor";
    }

    return "Stable";
  };

  const markConversationAsRead = useCallback(async () => {
    try {
      await API.patch("/chat/read", {
        patientId: id,
      });
    } catch (error) {
      console.error("Failed to clear unread patient messages", error);
    }
  }, [id]);

  const call = useConversationCall({
    socket,
    conversationRoomId,
    localUserId: currentUserId,
    localUserName: currentUser?.name || "Doctor",
    remoteUserId: id,
    remoteUserName: patient?.name || "Patient",
    canStartCall: Boolean(id && currentUserId),
  });

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsRecordDrawerOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsRecordDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const [patientRes, vitalsRes, apptRes, chatRes, alertRes] = await Promise.all([
          API.get(`/patients/${id}`),
          API.get(`/vitals/patient/${id}`),
          API.get(`/appointments/patient/${id}`),
          API.get(`/chat/${id}`),
          isAdminUser || currentUser?.role === "doctor"
            ? API.get("/alerts")
            : Promise.resolve({ data: [] }),
        ]);

        setPatient(patientRes.data.patient);
        setVitals(vitalsRes.data.vitals || []);
        setAppointments(apptRes.data.appointments || []);
        setMessages(chatRes.data || []);
        setActiveEmergencyAlert(
          isAdminUser
            ? getActiveAdminTriageEmergency(alertRes.data || [], id)
            : null,
        );
        setHighlightedAlert(
          (alertRes.data || []).find((alert) => alert._id === highlightedAlertId) ||
            null,
        );

        const vitalEvents = vitalsRes.data.vitals.map((v) => ({
          type: "vital",
          date: v.createdAt,
          data: v,
        }));

        const appointmentEvents = apptRes.data.appointments.map((a) => ({
          type: "appointment",
          date: a.appointmentDate,
          data: a,
        }));

        const combined = [...vitalEvents, ...appointmentEvents];

        combined.sort((a, b) => new Date(b.date) - new Date(a.date));

        setTimeline(combined);

        if (vitalsRes.data.vitals?.length > 0) {
          setLatestVital(vitalsRes.data.vitals[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchPatientData();

    const handleIncomingMessage = (incomingMessage) => {
      if (getEntityId(incomingMessage.patient) !== id) {
        return;
      }

      setMessages((prev) => appendMessageIfMissing(prev, incomingMessage));

      if (
        getEntityId(incomingMessage.sender) === id &&
        getEntityId(incomingMessage.receiver) === getCurrentUserId()
      ) {
        markConversationAsRead();
      }
    };

    socket.on("new-message", handleIncomingMessage);
    socket.on("conversation:new-message", handleIncomingMessage);

    return () => {
      socket.off("new-message", handleIncomingMessage);
      socket.off("conversation:new-message", handleIncomingMessage);
    };
  }, [currentUser?.role, highlightedAlertId, id, isAdminUser, markConversationAsRead]);

  useEffect(() => {
    markConversationAsRead();
  }, [markConversationAsRead]);

  useEffect(() => {
    if (shouldOpenChat && chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [shouldOpenChat, messages.length]);

  useEffect(() => {
    if (!attachedFile || !attachedFile.type?.startsWith("audio/")) {
      setAttachedAudioPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(attachedFile);
    setAttachedAudioPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [attachedFile]);

  useEffect(() => {
    downloadedAudioUrlsRef.current = downloadedAudioUrls;
  }, [downloadedAudioUrls]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      Object.values(downloadedAudioUrlsRef.current).forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
    };
  }, []);

  const getFileUrl = (fileUrl) => {
    return fileUrl ? resolveServerUrl(fileUrl) : "";
  };

  const isImageAttachment = (message) => {
    return (
      Boolean(message.fileUrl) &&
      (message.type === "image" || message.mimeType?.startsWith("image/"))
    );
  };

  const isAudioAttachment = (message) => {
    return (
      Boolean(message.fileUrl) &&
      (message.type === "audio" || message.mimeType?.startsWith("audio/"))
    );
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const startVoiceRecording = async () => {
    setChatFeedback("");
    setIsPreparingVoiceNote(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const chunks = [];
      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const extension = audioBlob.type.includes("ogg")
          ? "ogg"
          : audioBlob.type.includes("mp4")
            ? "m4a"
            : "webm";
        const recordedFile = new File(
          [audioBlob],
          `voice-note-${Date.now()}.${extension}`,
          {
            type: audioBlob.type,
          },
        );

        setAttachedFile(recordedFile);
        setIsRecording(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Voice recording failed", error);
      setChatFeedback("Microphone access is required to record a voice note.");
    } finally {
      setIsPreparingVoiceNote(false);
    }
  };

  const downloadAttachment = async (message) => {
    if (!message.fileUrl) return;

    try {
      const response = await fetch(getFileUrl(message.fileUrl));
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = message.fileName || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to download attachment", error);
    }
  };

  const prepareAudioPlayback = async (message) => {
    if (
      !message._id ||
      !message.fileUrl ||
      downloadedAudioUrls[message._id] ||
      downloadingAudioIds[message._id]
    ) {
      return;
    }

    setChatFeedback("");
    setDownloadingAudioIds((prev) => ({
      ...prev,
      [message._id]: true,
    }));

    try {
      const response = await fetch(getFileUrl(message.fileUrl));

      if (!response.ok) {
        throw new Error("Failed to fetch audio");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      setDownloadedAudioUrls((prev) => {
        if (prev[message._id]) {
          window.URL.revokeObjectURL(prev[message._id]);
        }

        return {
          ...prev,
          [message._id]: objectUrl,
        };
      });
    } catch (error) {
      console.error("Failed to prepare audio playback", error);
      setChatFeedback("Unable to download this voice note right now.");
    } finally {
      setDownloadingAudioIds((prev) => {
        const next = { ...prev };
        delete next[message._id];
        return next;
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;
    setChatFeedback("");

    const senderId = getCurrentUserId();

    if (!senderId) {
      alert("Unable to identify the logged-in staff user. Please log in again.");
      return;
    }

    try {
      const payload = new FormData();

      payload.append("patient", id);
      payload.append("sender", senderId);
      payload.append("receiver", id);

      if (newMessage.trim()) {
        payload.append("message", newMessage.trim());
      }

      if (attachedFile) {
        payload.append("file", attachedFile);
      }

      const res = await API.post("/chat/send", payload);

      setMessages((prev) => appendMessageIfMissing(prev, res.data.chat));
      setNewMessage("");
      setAttachedFile(null);
    } catch (err) {
      console.error(err);
      setChatFeedback(
        err.response?.data?.message || "Unable to send attachment",
      );
    }
  };

  const handleComposerKeyDown = (event) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent?.isComposing
    ) {
      return;
    }

    event.preventDefault();

    if (!newMessage.trim() && !attachedFile) {
      return;
    }

    sendMessage();
  };

  const resolveEmergencyCase = async () => {
    if (!activeEmergencyAlert?._id) {
      return;
    }

    const shouldResolve = window.confirm(
      "Close this emergency case without routing it to a doctor?",
    );

    if (!shouldResolve) {
      return;
    }

    setIsResolvingEmergency(true);
    setChatFeedback("");

    try {
      await API.patch(`/alerts/${activeEmergencyAlert._id}/resolve`, {
        resolutionNote: "Resolved by admin after triage assessment.",
      });
      setActiveEmergencyAlert(null);
      setChatFeedback("Emergency case closed.");
    } catch (error) {
      console.error("Failed to resolve emergency case", error);
      setChatFeedback(
        error.response?.data?.message ||
          "Unable to close the emergency case right now.",
      );
    } finally {
      setIsResolvingEmergency(false);
    }
  };

  const persistConsultationRecord = async (
    appointmentId,
    record,
    options = {},
  ) => {
    try {
      const res = await API.patch(
        `/appointments/${appointmentId}/consultation-record`,
        {
          diagnosis: record?.diagnosis || "",
          prescription: record?.prescription || "",
          followUpPlan: record?.followUpPlan || "",
          visitSummary: record?.visitSummary || "",
          markCompleted: options.markCompleted === true,
        },
      );

      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === appointmentId ? res.data.appointment : appt,
        ),
      );

      setSavedRecordId(appointmentId);
      setShowSaveToast(true);

      setTimeout(() => {
        setSavedRecordId(null);
        setShowSaveToast(false);
      }, 2000);

      setExpandedAppointment(null);
    } catch (error) {
      console.error("Failed to save consultation record", error);
    }
  };

  const saveConsultationRecord = (appointmentId, record, options = {}) =>
    persistConsultationRecord(appointmentId, record, options);

  const completeAppointment = (appointmentId, record) =>
    persistConsultationRecord(appointmentId, record, {
      markCompleted: true,
    });

  const saveNotes = async (appointmentId) => {
    const notes = document.getElementById(`notes-${appointmentId}`)?.value || "";
    await persistConsultationRecord(
      appointmentId,
      { visitSummary: notes },
      { markCompleted: false },
    );
  };

  const autoSaveNotes = async (appointmentId, notes) => {
    if (!notes) return;

    await persistConsultationRecord(
      appointmentId,
      { visitSummary: notes },
      { markCompleted: false },
    );
  };

  const toggleAppointment = (appointmentId) => {
    setExpandedAppointment((prev) =>
      prev === appointmentId ? null : appointmentId,
    );
  };

  return (
    <DoctorShell
      title={patient?.name || "Patient Profile"}
      subtitle={
        isAdminUser
          ? "Assess the emergency case, continue triage, and hand the patient to a doctor when intervention is required."
          : "Consult the patient record, review historical readings and continue the conversation."
      }
    >
      {showSaveToast && (
        <div className="hidden fixed right-4 top-20 z-50 rounded-2xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          Consultation record saved
        </div>
      )}

      {showSaveToast && (
        <div className="fixed right-4 top-20 z-50 rounded-2xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          Consultation record saved
        </div>
      )}

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          isRecordDrawerOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => setIsRecordDrawerOpen(false)}
          className={`absolute inset-0 bg-slate-950/55 transition ${
            isRecordDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-slate-100 p-4 transition-transform duration-300 ${
            isRecordDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Patient Record
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {patient?.name || "Patient"}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsRecordDrawerOpen(false)}
              className="rounded-full border border-slate-200 p-2 text-slate-600"
              aria-label="Close patient record"
            >
              <CloseIcon />
            </button>
          </div>

          <PatientRecordPanel
            patient={patient}
            latestVital={latestVital}
            getRiskLevel={getRiskLevel}
            vitals={vitals}
            timeline={timeline}
            timelineLimit={timelineLimit}
            onTimelineLimitChange={setTimelineLimit}
            appointments={appointments}
            expandedAppointment={expandedAppointment}
            onToggleAppointment={toggleAppointment}
            onSaveConsultationRecord={saveConsultationRecord}
            onCompleteAppointment={completeAppointment}
            savedRecordId={savedRecordId}
            compact
            readOnly={!canManageAppointments}
          />
        </div>
      </div>

      <div className="space-y-6">
        <section className={`p-5 lg:hidden ${surfaceClass}`}>
          <button
            type="button"
            onClick={() => setIsRecordDrawerOpen(true)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
                {patientInitials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-slate-900">
                  {patient?.name || "Patient"}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {patient?.email || "Patient details"}
                </p>
                <p className="mt-1 text-sm font-medium text-blue-600">
                  Open full record
                </p>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              Records
            </span>
          </button>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">BP</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {latestVital
                  ? `${latestVital.systolic}/${latestVital.diastolic}`
                  : "--/--"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Glucose</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {latestVital?.glucoseLevel ?? "--"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Risk</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {getRiskLevel()}
              </p>
            </div>
          </div>
        </section>

        <div className="hidden lg:block">
          <PatientRecordPanel
            patient={patient}
            latestVital={latestVital}
            getRiskLevel={getRiskLevel}
            vitals={vitals}
            timeline={timeline}
            timelineLimit={timelineLimit}
            onTimelineLimitChange={setTimelineLimit}
            appointments={appointments}
            expandedAppointment={expandedAppointment}
            onToggleAppointment={toggleAppointment}
            onSaveConsultationRecord={saveConsultationRecord}
            onCompleteAppointment={completeAppointment}
            savedRecordId={savedRecordId}
            readOnly={!canManageAppointments}
          />
        </div>

        {showLegacyRecordMarkup && <div className="hidden">

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Patient Health Summary</h2>

          {latestVital ? (
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-gray-500 text-sm">Latest BP</p>
                <p className="text-lg font-semibold">
                  {latestVital.systolic}/{latestVital.diastolic}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-sm">Glucose</p>
                <p className="text-lg font-semibold">
                  {latestVital.glucoseLevel}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-sm">Risk Level</p>

                <p
                  className={
                    getRiskLevel() === "High"
                      ? "text-red-600 font-semibold"
                      : getRiskLevel() === "Monitor"
                        ? "text-yellow-600 font-semibold"
                        : "text-green-600 font-semibold"
                  }
                >
                  {getRiskLevel()}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-sm">Last Reading</p>
                <p className="text-lg font-semibold">
                  {new Date(latestVital.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p>No vitals available</p>
          )}
        </div>

        {/* Patient Info */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Patient Information</h2>

          <p>Name: {patient?.name}</p>
          <p>Email: {patient?.email}</p>
        </div>

        {/* Vitals history */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Vitals History</h2>

          <p className="mb-4">Total Readings: {vitals.length}</p>

          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th>Date</th>
                <th>Blood Pressure</th>
                <th>Glucose</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {vitals.map((v) => (
                <tr key={v._id} className="border-b">
                  <td>{new Date(v.createdAt).toLocaleDateString()}</td>

                  <td>
                    {v.systolic}/{v.diastolic}
                  </td>

                  <td>{v.glucoseLevel}</td>

                  <td>
                    {v.flagged ? (
                      <span className="text-red-600 font-semibold">
                        Critical
                      </span>
                    ) : (
                      <span className="text-green-600">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* charts trend */}

        <h3 className="text-lg font-semibold mt-6 mb-10">Vitals Trend</h3>

        <div className="w-full h-[300px]">
          <ResponsiveContainer>
            <LineChart data={vitals}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="createdAt"
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />

              <YAxis />

              <Tooltip />

              <Line type="monotone" dataKey="systolic" stroke="#2563eb" />

              <Line type="monotone" dataKey="glucoseLevel" stroke="#dc2626" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6 transition-all duration-500 ease-in-out">
          <h2 className="text-xl font-semibold mb-4">Medical Timeline</h2>

          <div className="space-y-4">
            {timeline.slice(0, timelineLimit).map((event, index) => (
              <div
                key={index}
                className="border-l-4 border-blue-500 pl-4 py-2 opacity-0 animate-fadeIn"
              >
                <p className="text-sm text-gray-500">
                  {new Date(event.date).toLocaleString()}
                </p>

                {event.type === "vital" && (
                  <div>
                    <p className="font-semibold">Vital Reading</p>

                    <p>
                      BP: {event.data.systolic}/{event.data.diastolic}
                    </p>

                    <p>Glucose: {event.data.glucoseLevel}</p>

                    {event.data.flagged && (
                      <p className="text-red-600 font-semibold">
                        Critical Alert
                      </p>
                    )}
                  </div>
                )}

                {event.type === "appointment" && (
                  <div>
                    <p className="font-semibold">
                      Appointment ({event.data.status})
                    </p>

                    {event.data.doctorNotes && (
                      <p className="text-gray-700">
                        Notes: {event.data.doctorNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-4 flex items-center gap-2">
              <label className="text-sm text-gray-600">Show more:</label>

              <select
                className="border rounded px-2 py-1"
                onChange={(e) => setTimelineLimit(Number(e.target.value))}
                value={timelineLimit}
              >
                <option value={4}>Last 4</option>
                <option value={10}>Last 10</option>
                <option value={20}>Last 20</option>
                <option value={timeline.length}>All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Appointments</h2>

          {appointments.length === 0 ? (
            <p>No appointments found</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th>Date</th>
                  <th>Doctor</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {appointments.map((appt) => (
                  <>
                    <tr
                      key={appt._id}
                      className="border-b cursor-pointer hover:bg-gray-100"
                      onClick={() =>
                        setExpandedAppointment(
                          expandedAppointment === appt._id ? null : appt._id,
                        )
                      }
                    >
                      <td>
                        {new Date(appt.appointmentDate).toLocaleDateString()}
                      </td>

                      <td>{appt.doctor?.name}</td>

                      <td
                        className={
                          appt.status === "completed"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }
                      >
                        {appt.status}
                      </td>
                    </tr>

                    {expandedAppointment === appt._id && (
                      <tr>
                        <td colSpan="4" className="p-4 bg-gray-50">
                          {appt.reason && (
                            <div className="mb-3 rounded border border-blue-100 bg-blue-50 p-3">
                              <p className="text-sm font-semibold text-blue-900">
                                Appointment reason
                              </p>
                              <p className="text-sm text-blue-800 mt-1">
                                {appt.reason}
                              </p>
                            </div>
                          )}

                          <textarea
                            id={`notes-${appt._id}`}
                            defaultValue={appt.doctorNotes}
                            placeholder="Write visit notes..."
                            className="border p-2 w-full rounded"
                            onBlur={(e) =>
                              autoSaveNotes(appt._id, e.target.value)
                            }
                          />

                          {savedNoteId === appt._id && (
                            <p className="text-green-600 text-sm mt-2">
                              ✓ Notes saved
                            </p>
                          )}

                          <button
                            onClick={() => saveNotes(appt._id)}
                            className="bg-green-600 text-white px-3 py-1 rounded mt-2"
                          >
                            Save Notes
                          </button>
                          <button
                            onClick={() => completeAppointment(appt._id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded mt-2 ml-2"
                          >
                            Complete Visit
                          </button>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        </div>}

        {/* Chat */}
        <section
          ref={chatRef}
          id="chat"
          className={`p-4 sm:p-6 ${surfaceClass}`}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRecordDrawerOpen(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 lg:hidden"
                aria-label="Open patient record"
              >
                {patientInitials}
              </button>

              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 lg:flex">
                {patientInitials}
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-slate-900">
                  Conversation
                </h2>
                <p className="truncate text-sm text-slate-500">
                  {patient?.name || "Patient"}
                  <button
                    type="button"
                    onClick={() => setIsRecordDrawerOpen(true)}
                    className="ml-2 font-medium text-blue-600 lg:hidden"
                  >
                    View records
                  </button>
                </p>
                {call.callError && (
                  <p className="mt-2 text-sm text-red-600">{call.callError}</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={call.startAudioCall}
                disabled={call.callActionsDisabled}
                aria-label="Start voice call"
                title="Start voice call"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-11 sm:w-11"
              >
                <PhoneCallIcon />
              </button>
              <button
                type="button"
                onClick={call.startVideoCall}
                disabled={call.callActionsDisabled}
                aria-label="Start video call"
                title="Start video call"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-11 sm:w-11"
              >
                <VideoCallIcon />
              </button>
            </div>
          </div>

          {isAdminUser && activeEmergencyAlert && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-rose-700">
                    Emergency triage is active
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Close the case here if the issue was resolved during triage and no doctor handoff is needed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resolveEmergencyCase}
                  disabled={isResolvingEmergency}
                  className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResolvingEmergency ? "Closing..." : "Close emergency"}
                </button>
              </div>
            </div>
          )}

          <ConversationCallPanel
            participantName={patient?.name || "Patient"}
            callState={call.callState}
            callMode={call.callMode}
            statusMessage={call.statusMessage}
            localStream={call.localStream}
            remoteStream={call.remoteStream}
            isMicEnabled={call.isMicEnabled}
            isCameraEnabled={call.isCameraEnabled}
            canToggleCamera={call.canToggleCamera}
            onAcceptCall={call.acceptCall}
            onDeclineCall={call.declineCall}
            onEndCall={() => call.endCall()}
            onToggleMicrophone={call.toggleMicrophone}
            onToggleCamera={call.toggleCamera}
          />

          {highlightedAppointment && (
            <div className="mb-4 rounded border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Appointment context
              </p>
              <p className="text-sm text-blue-800 mt-1">
                Reason: {highlightedAppointment.reason || "No reason provided"}
              </p>
              <p className="text-xs text-blue-700 mt-2">
                {new Date(
                  highlightedAppointment.appointmentDate,
                ).toLocaleString()}{" "}
                | Status: {highlightedAppointment.status}
              </p>
            </div>
          )}

          {highlightedAlert && (
            <div className="mb-4 rounded border border-rose-100 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-900">
                {highlightedAlert.type === "emergency"
                  ? "Emergency context"
                  : "Critical alert context"}
              </p>
              <p className="mt-1 text-sm text-rose-800">
                {highlightedAlert.type === "emergency"
                  ? highlightedAlert.message
                  : `BP ${highlightedAlert.systolic || "-"}/${highlightedAlert.diastolic || "-"} | Glucose ${highlightedAlert.glucoseLevel || "-"}`}
              </p>
              <p className="mt-2 text-xs text-rose-700">
                {new Date(highlightedAlert.createdAt).toLocaleString()} | Status:{" "}
                {highlightedAlert.status || "active"}
              </p>
            </div>
          )}

          <div className="mb-4 h-[52vh] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:h-[560px]">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">
                No conversation yet. Start by sending a message below.
              </p>
            ) : (
              messages.map((msg) => {
                if (isCallLogMessage(msg)) {
                  return (
                    <div key={msg._id} className="mb-3 flex justify-center">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-900">
                          {getCallLogTitle(msg)}
                        </p>

                        {msg.callDetails?.status === "completed" && (
                          <p className="mt-1 text-xs text-slate-600">
                            Duration:{" "}
                            {formatCallDuration(
                              msg.callDetails?.durationSeconds,
                            )}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-slate-500">
                          {msg.sender?.name || "Care team"} |{" "}
                          {new Date(
                            msg.callDetails?.endedAt || msg.createdAt,
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                }

                const isOutgoing = getEntityId(msg.sender) === currentUserId;
                const audioUrl = downloadedAudioUrls[msg._id];
                const isAudioMessage = isAudioAttachment(msg);
                const isDownloadingAudio = Boolean(downloadingAudioIds[msg._id]);

                return (
                  <div
                    key={msg._id}
                    className={`mb-3 flex ${
                      isOutgoing ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                        isOutgoing
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-900"
                      }`}
                    >
                      <p
                        className={`mb-1 text-xs font-semibold ${
                          isOutgoing ? "text-blue-100" : "text-slate-500"
                        }`}
                      >
                        {msg.sender?.name || "Care team"}
                      </p>

                      {msg.message && (
                        <p className="whitespace-pre-wrap break-words text-sm sm:text-[15px]">
                          {msg.message}
                        </p>
                      )}

                      {msg.fileUrl && (
                        <div className="mt-2">
                          {isImageAttachment(msg) && (
                            <img
                              src={getFileUrl(msg.fileUrl)}
                              alt={msg.fileName || "Attachment"}
                              className="max-h-64 rounded-2xl border border-white/20 object-cover"
                            />
                          )}

                          {isAudioMessage && (
                            <div
                              className={`mt-2 rounded-2xl p-3 ${
                                isOutgoing ? "bg-white/15" : "bg-slate-50"
                              }`}
                            >
                              <p className="text-sm font-medium">
                                {msg.fileName || "Voice note"}
                              </p>

                              {audioUrl ? (
                                <audio
                                  controls
                                  src={audioUrl}
                                  className="mt-2 w-full"
                                />
                              ) : (
                                <div className="mt-2 flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => prepareAudioPlayback(msg)}
                                    disabled={isDownloadingAudio}
                                    className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition ${
                                      isOutgoing
                                        ? "bg-blue-500 hover:bg-blue-400 disabled:bg-blue-300"
                                        : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                                    }`}
                                    aria-label={
                                      isDownloadingAudio
                                        ? "Downloading voice note"
                                        : "Download voice note to play"
                                    }
                                    title={
                                      isDownloadingAudio
                                        ? "Downloading voice note"
                                        : "Download voice note to play"
                                    }
                                  >
                                    {isDownloadingAudio ? (
                                      <span className="text-xs font-semibold">
                                        ...
                                      </span>
                                    ) : (
                                      <DownloadIcon />
                                    )}
                                  </button>

                                  <p
                                    className={`text-xs ${
                                      isOutgoing
                                        ? "text-blue-100"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {isDownloadingAudio
                                      ? "Downloading voice note..."
                                      : "Download to unlock playback in chat."}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {!isAudioMessage && !isImageAttachment(msg) && (
                            <div
                              className={`rounded-2xl p-3 ${
                                isOutgoing ? "bg-white/15" : "bg-slate-50"
                              }`}
                            >
                              <p className="text-sm font-medium">
                                {msg.fileName || "Attachment"}
                              </p>
                              <button
                                type="button"
                                onClick={() => downloadAttachment(msg)}
                                className={`mt-2 text-sm font-medium ${
                                  isOutgoing
                                    ? "text-blue-100"
                                    : "text-blue-600"
                                }`}
                              >
                                Download
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {attachedFile && (
            <div className="mb-3 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <span className="block truncate">{attachedFile.name}</span>
                {attachedFile.type?.startsWith("audio/") && (
                  <audio
                    controls
                    src={attachedAudioPreviewUrl}
                    className="mt-2 w-full"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-sm font-medium text-red-600"
              >
                Remove
              </button>
            </div>
          )}

          {chatFeedback && (
            <p className="mb-3 text-sm text-red-600">{chatFeedback}</p>
          )}

          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Type message..."
            />

            <label
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300"
              aria-label="Attach file"
              title="Attach file"
            >
              <AttachIcon />
              <input
                type="file"
                accept={CHAT_FILE_ACCEPT}
                className="hidden"
                onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
              />
            </label>

            <button
              type="button"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isPreparingVoiceNote}
              aria-label={isRecording ? "Stop voice recording" : "Record voice note"}
              title={isRecording ? "Stop voice recording" : "Record voice note"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition ${
                isRecording ? "bg-red-600 hover:bg-red-700" : "bg-slate-700 hover:bg-slate-800"
              } disabled:bg-slate-400`}
            >
              {isPreparingVoiceNote ? (
                <span className="text-xs font-semibold">...</span>
              ) : isRecording ? (
                <StopIcon />
              ) : (
                <MicIcon />
              )}
            </button>

            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() && !attachedFile}
              className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-300 sm:w-auto"
            >
              Send
            </button>
          </div>
        </section>
      </div>
    </DoctorShell>
  );
}

export default PatientProfile;
