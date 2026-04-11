import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/api";
import ConversationCallPanel from "../components/ConversationCallPanel";
import { getPatientId, getStoredUser } from "../auth";
import useConversationCall from "../hooks/useConversationCall";
import useUnreadChats from "../hooks/useUnreadChats";

const socket = io("http://localhost:5000", { autoConnect: false });
const SERVER_BASE_URL = "http://localhost:5000";
const CHAT_FILE_ACCEPT =
  ".doc,.docx,.pdf,.txt,image/png,image/jpeg,image/webp,image/gif,audio/*";

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

function ChevronLeftIcon({ className = "h-5 w-5" }) {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export default function Chat() {
  const patientId = getPatientId();
  const patientUser = getStoredUser();
  const { unreadCountsByDoctor } = useUnreadChats();
  const [searchParams] = useSearchParams();
  const initialDoctorId = searchParams.get("doctor") || "";
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId);
  const [mobilePane, setMobilePane] = useState(
    initialDoctorId ? "conversation" : "list",
  );
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedAudioPreviewUrl, setAttachedAudioPreviewUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparingVoiceNote, setIsPreparingVoiceNote] = useState(false);
  const [downloadedAudioUrls, setDownloadedAudioUrls] = useState({});
  const [downloadingAudioIds, setDownloadingAudioIds] = useState({});
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const downloadedAudioUrlsRef = useRef({});
  const messagesEndRef = useRef(null);

  const markConversationAsRead = useCallback(async () => {
    if (!selectedDoctorId) {
      return;
    }

    try {
      await API.patch("/chat/read", {
        otherUserId: selectedDoctorId,
      });
    } catch (error) {
      console.error("Failed to clear unread doctor messages", error);
    }
  }, [selectedDoctorId]);

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await API.get("/doctors");
        setDoctors(res.data.doctors ?? []);
      } catch (error) {
        console.error("Failed to fetch doctors", error);
      }
    };

    fetchDoctors();
  }, []);

  useEffect(() => {
    const fetchConversation = async () => {
      if (!patientId || !selectedDoctorId) {
        setMessages([]);
        return;
      }

      try {
        const res = await API.get(
          `/chat/${patientId}?doctorId=${selectedDoctorId}`,
        );
        setMessages(res.data ?? []);
      } catch (error) {
        console.error("Failed to fetch conversation", error);
      }
    };

    fetchConversation();
  }, [patientId, selectedDoctorId]);

  useEffect(() => {
    markConversationAsRead();
  }, [markConversationAsRead]);

  useEffect(() => {
    if (!selectedDoctorId) {
      return;
    }

    setMobilePane("conversation");
  }, [selectedDoctorId]);

  useEffect(() => {
    const handleIncomingMessage = (message) => {
      const senderId = getEntityId(message.sender);
      const receiverId = getEntityId(message.receiver);
      const patientMessageId = getEntityId(message.patient);

      if (
        patientMessageId === patientId &&
        [senderId, receiverId].includes(selectedDoctorId)
      ) {
        setMessages((prev) => appendMessageIfMissing(prev, message));

        if (senderId === selectedDoctorId && receiverId === patientId) {
          markConversationAsRead();
        }
      }
    };

    socket.on("new-message", handleIncomingMessage);

    return () => {
      socket.off("new-message", handleIncomingMessage);
    };
  }, [markConversationAsRead, patientId, selectedDoctorId]);

  useEffect(() => {
    downloadedAudioUrlsRef.current = downloadedAudioUrls;
  }, [downloadedAudioUrls]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      Object.values(downloadedAudioUrlsRef.current).forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

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

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return doctors;

    return doctors.filter((doctor) =>
      [doctor.name, doctor.specialty, doctor.email]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [doctors, search]);

  const selectedDoctor = doctors.find(
    (doctor) => doctor._id === selectedDoctorId,
  );
  const conversationRoomId = buildConversationRoomId(patientId, selectedDoctorId);
  const isSelectedDoctorOnline = Boolean(selectedDoctor?.isOnline);
  const canSendMessage = Boolean(
    isSelectedDoctorOnline && (newMessage.trim() || attachedFile),
  );
  const call = useConversationCall({
    socket,
    conversationRoomId,
    localUserId: patientId,
    localUserName: patientUser?.name || "Patient",
    remoteUserId: selectedDoctorId,
    remoteUserName: selectedDoctor?.name || "Doctor",
    canStartCall: Boolean(selectedDoctor?.isOnline),
  });

  const getFileUrl = (fileUrl) => {
    return fileUrl ? new URL(fileUrl, SERVER_BASE_URL).toString() : "";
  };

  const selectDoctor = (doctorId) => {
    setSelectedDoctorId(doctorId);
    setMobilePane("conversation");
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
    setFeedback("");
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
      setFeedback("Microphone access is required to record a voice note.");
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

    setFeedback("");
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
      setFeedback("Unable to download this voice note right now.");
    } finally {
      setDownloadingAudioIds((prev) => {
        const next = { ...prev };
        delete next[message._id];
        return next;
      });
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachedFile) || !selectedDoctorId) return;
    setFeedback("");

    try {
      const payload = new FormData();

      payload.append("patient", patientId);
      payload.append("receiver", selectedDoctorId);

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
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Unable to send message right now.",
      );
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.94fr_1.06fr] lg:items-start">
      <section
        className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${
          mobilePane === "conversation" ? "hidden lg:block" : "block"
        }`}
      >
        <div className="mb-4">
          <p className="text-sm uppercase tracking-[0.22em] text-blue-600">
            Messaging
          </p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Doctors</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            Online doctors can be chatted immediately. Offline doctors remain
            visible but unavailable.
          </p>
        </div>

        <input
          className="mb-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder="Search doctors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredDoctors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No doctors matched your search.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDoctors.map((doctor) => (
              <button
                key={doctor._id}
                type="button"
                onClick={() => selectDoctor(doctor._id)}
                className={`w-full rounded-2xl border p-4 text-left transition sm:p-5 ${
                  selectedDoctorId === doctor._id
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } ${doctor.isOnline ? "" : "opacity-80"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">
                        {doctor.name}
                      </p>
                      {unreadCountsByDoctor[doctor._id] > 0 && (
                        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                          {unreadCountsByDoctor[doctor._id]}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {doctor.specialty}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {doctor.isOnline
                        ? "Available for instant chat and calls."
                        : "Visible here, but unavailable until back online."}
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      doctor.isOnline
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {doctor.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section
        className={`min-h-[70svh] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:flex lg:min-h-[38rem] lg:flex-col ${
          mobilePane === "list" ? "hidden lg:flex" : "flex flex-col"
        }`}
      >
        <div className="mb-4 border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobilePane("list")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  aria-label="Back to doctors"
                >
                  <ChevronLeftIcon />
                </button>
                <span className="text-sm font-medium text-slate-500">
                  Back to doctors
                </span>
              </div>

              <h2 className="truncate text-2xl font-semibold sm:text-[1.75rem]">
                {selectedDoctor ? selectedDoctor.name : "Select a doctor"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                {selectedDoctor
                  ? `${selectedDoctor.specialty} | ${
                      isSelectedDoctorOnline ? "Online" : "Offline"
                    }`
                  : "Choose an online doctor to start chatting."}
              </p>
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

          {call.callError && (
            <p className="mt-3 text-sm text-red-600">{call.callError}</p>
          )}
        </div>

        <ConversationCallPanel
          participantName={selectedDoctor?.name || "Doctor"}
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center text-sm leading-6 text-slate-500">
              {selectedDoctor
                ? "No messages yet. Start the conversation below."
                : "Select an online doctor from the list to begin."}
            </div>
          ) : (
            messages.map((message) => {
              if (isCallLogMessage(message)) {
                return (
                  <div key={message._id} className="flex justify-center">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">
                        {getCallLogTitle(message)}
                      </p>

                      {message.callDetails?.status === "completed" && (
                        <p className="mt-1 text-xs text-slate-600">
                          Duration:{" "}
                          {formatCallDuration(
                            message.callDetails?.durationSeconds,
                          )}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-slate-500">
                        {message.sender?.name || "Care team"} |{" "}
                        {new Date(
                          message.callDetails?.endedAt || message.createdAt,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              }

              const isPatientMessage = message.sender?.role === "patient";

              return (
                <div
                  key={message._id}
                  className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[80%] ${
                    isPatientMessage
                      ? "ml-auto bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {message.sender?.name || "Care team"}
                  </p>

                  {message.message && <p>{message.message}</p>}

                  {message.fileUrl && (
                    <div className="mt-2">
                      {(() => {
                        const audioUrl = downloadedAudioUrls[message._id];
                        const isAudioMessage = isAudioAttachment(message);
                        const isDownloadingAudio = Boolean(
                          downloadingAudioIds[message._id],
                        );

                        return (
                          <>
                            {isImageAttachment(message) && (
                              <img
                                src={getFileUrl(message.fileUrl)}
                                alt={message.fileName || "Attachment"}
                                className="max-h-52 w-full rounded border object-cover sm:max-w-xs"
                              />
                            )}

                            {isAudioMessage && (
                              <div
                                className={`mt-2 rounded-2xl p-3 ${
                                  isPatientMessage ? "bg-white/15" : "bg-white"
                                }`}
                              >
                                <p className="text-sm font-medium">
                                  {message.fileName || "Voice note"}
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
                                      onClick={() => prepareAudioPlayback(message)}
                                      disabled={isDownloadingAudio}
                                      className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition ${
                                        isPatientMessage
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
                                        isPatientMessage
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

                            {!isAudioMessage && (
                              <div
                                className={`rounded-xl p-3 mt-2 ${
                                  isPatientMessage ? "bg-white/15" : "bg-white"
                                }`}
                              >
                                <p className="text-sm font-medium">
                                  {message.fileName || "Attachment"}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => downloadAttachment(message)}
                                  className={`text-sm mt-1 ${
                                    isPatientMessage
                                      ? "text-blue-100"
                                      : "text-blue-600"
                                  }`}
                                >
                                  Download
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          {feedback && <p className="text-sm text-red-600 mb-3">{feedback}</p>}

          {attachedFile && (
            <div className="mb-3 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm sm:flex-row sm:items-center">
              <div className="flex-1">
                <span className="break-all">{attachedFile.name}</span>
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
                className="self-start text-red-600 sm:ml-3"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                isSelectedDoctorOnline
                  ? "Type a message"
                  : "Select an online doctor to start chatting"
              }
              disabled={!isSelectedDoctorOnline}
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            />

            <div className="flex items-center justify-end gap-2 sm:shrink-0">
              <label
                className="flex h-[3.15rem] w-[3.15rem] cursor-pointer items-center justify-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300"
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
                className={`flex h-[3.15rem] w-[3.15rem] items-center justify-center rounded-full text-white transition ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-slate-700 hover:bg-slate-800"
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
                type="button"
                onClick={sendMessage}
                disabled={!canSendMessage}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-300"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
