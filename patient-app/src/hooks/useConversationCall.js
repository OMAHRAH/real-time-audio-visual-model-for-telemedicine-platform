import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "../api/api";

const DEFAULT_RTC_CONFIGURATION = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const CALL_TIMEOUT_MS = 30000;

const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const createRemoteStream = (streams, eventTrack) => {
  if (streams?.[0]) {
    return streams[0];
  }

  const stream = new MediaStream();

  if (eventTrack) {
    stream.addTrack(eventTrack);
  }

  return stream;
};

const parseConversationRoomId = (roomId) => {
  const [, patientId = "", doctorId = ""] = roomId?.split(":") || [];

  return { patientId, doctorId };
};

const createCallId = () => {
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export default function useConversationCall({
  socket,
  conversationRoomId,
  localUserId,
  localUserName,
  remoteUserId,
  remoteUserName,
  canStartCall = true,
}) {
  const [callState, setCallState] = useState("idle");
  const [callMode, setCallMode] = useState("audio");
  const [callError, setCallError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  const initialParticipants = parseConversationRoomId(conversationRoomId);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callTimeoutRef = useRef(null);
  const rtcConfigurationRef = useRef(DEFAULT_RTC_CONFIGURATION);
  const roomIdRef = useRef(conversationRoomId);
  const remoteUserIdRef = useRef(remoteUserId);
  const remoteUserNameRef = useRef(remoteUserName);
  const patientIdRef = useRef(initialParticipants.patientId);
  const callStateRef = useRef("idle");
  const callModeRef = useRef("audio");
  const incomingCallRef = useRef(null);
  const callIdRef = useRef("");
  const isInitiatorRef = useRef(false);
  const activeStartedAtRef = useRef(null);
  const callLogSubmittedRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const loadIceServers = async () => {
      try {
        const res = await API.get("/calls/ice-servers");

        if (!isActive || !Array.isArray(res.data?.iceServers)) {
          return;
        }

        rtcConfigurationRef.current = {
          iceServers:
            res.data.iceServers.length > 0
              ? res.data.iceServers
              : DEFAULT_RTC_CONFIGURATION.iceServers,
        };
      } catch (error) {
        console.error("Failed to load ICE servers", error);
      }
    };

    void loadIceServers();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    roomIdRef.current = conversationRoomId;
    remoteUserIdRef.current = remoteUserId;
    remoteUserNameRef.current = remoteUserName;
    patientIdRef.current = parseConversationRoomId(conversationRoomId).patientId;
  }, [conversationRoomId, remoteUserId, remoteUserName]);

  useEffect(() => {
    callStateRef.current = callState;
    callModeRef.current = callMode;
    incomingCallRef.current = incomingCall;
  }, [callMode, callState, incomingCall]);

  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      window.clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  const resetCallSession = useCallback(() => {
    callIdRef.current = "";
    isInitiatorRef.current = false;
    activeStartedAtRef.current = null;
    callLogSubmittedRef.current = false;
  }, []);

  const persistCallLog = useCallback(async (status) => {
    if (
      !status ||
      !isInitiatorRef.current ||
      callLogSubmittedRef.current ||
      !patientIdRef.current ||
      !remoteUserIdRef.current
    ) {
      return;
    }

    const endedAt = new Date();
    const startedAt = activeStartedAtRef.current
      ? new Date(activeStartedAtRef.current)
      : null;
    const durationSeconds =
      status === "completed" && startedAt
        ? Math.max(
            0,
            Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
          )
        : 0;

    callLogSubmittedRef.current = true;

    try {
      await API.post("/calls/log", {
        patientId: patientIdRef.current,
        otherUserId: remoteUserIdRef.current,
        mode: callModeRef.current === "video" ? "video" : "audio",
        status,
        durationSeconds,
        startedAt: startedAt ? startedAt.toISOString() : undefined,
        endedAt: endedAt.toISOString(),
      });
    } catch (error) {
      callLogSubmittedRef.current = false;
      console.error("Failed to save call log", error);
    }
  }, []);

  const getDefaultLogStatus = useCallback(() => {
    if (!isInitiatorRef.current || callLogSubmittedRef.current) {
      return "";
    }

    return activeStartedAtRef.current ? "completed" : "canceled";
  }, []);

  const resetCallState = useCallback(
    ({ errorMessage = "" } = {}) => {
      clearCallTimeout();

      if (peerConnectionRef.current) {
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      stopStream(localStreamRef.current);
      stopStream(remoteStreamRef.current);

      localStreamRef.current = null;
      remoteStreamRef.current = null;
      pendingCandidatesRef.current = [];
      resetCallSession();

      setIncomingCall(null);
      setLocalStream(null);
      setRemoteStream(null);
      setCallState("idle");
      setCallMode("audio");
      setStatusMessage("");
      setIsMicEnabled(true);
      setIsCameraEnabled(true);
      setCallError(errorMessage);
    },
    [clearCallTimeout, resetCallSession],
  );

  const flushPendingCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection?.remoteDescription) {
      return;
    }

    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();

      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to add queued ICE candidate", error);
      }
    }
  }, []);

  const endCall = useCallback(
    async ({ notifyPeer = true, errorMessage = "", logStatus } = {}) => {
      clearCallTimeout();

      if (notifyPeer && roomIdRef.current && remoteUserIdRef.current) {
        socket.emit("call:end", {
          roomId: roomIdRef.current,
          fromUserId: localUserId,
          toUserId: remoteUserIdRef.current,
          callId: callIdRef.current,
        });
      }

      const resolvedLogStatus = logStatus ?? getDefaultLogStatus();

      if (resolvedLogStatus) {
        await persistCallLog(resolvedLogStatus);
      }

      resetCallState({ errorMessage });
    },
    [
      clearCallTimeout,
      getDefaultLogStatus,
      localUserId,
      persistCallLog,
      resetCallState,
      socket,
    ],
  );

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection(rtcConfigurationRef.current);

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !roomIdRef.current || !remoteUserIdRef.current) {
        return;
      }

      socket.emit("call:ice-candidate", {
        roomId: roomIdRef.current,
        fromUserId: localUserId,
        toUserId: remoteUserIdRef.current,
        callId: callIdRef.current,
        candidate: event.candidate.toJSON(),
      });
    };

    peerConnection.ontrack = (event) => {
      const stream = createRemoteStream(event.streams, event.track);
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      clearCallTimeout();

      if (!activeStartedAtRef.current) {
        activeStartedAtRef.current = new Date().toISOString();
      }

      setCallState("active");
      setStatusMessage(
        callModeRef.current === "video"
          ? "Video call connected"
          : "Voice call connected",
      );
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "failed") {
        void endCall({
          notifyPeer: true,
          errorMessage: "Call connection failed. Please try again.",
        });
      }
    };

    peerConnectionRef.current = peerConnection;

    return peerConnection;
  }, [clearCallTimeout, endCall, localUserId, socket]);

  const prepareLocalStream = useCallback(async (mode) => {
    stopStream(localStreamRef.current);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video:
        mode === "video"
          ? {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    setIsMicEnabled(true);
    setIsCameraEnabled(mode === "video");

    return stream;
  }, []);

  const addLocalTracks = useCallback((peerConnection, stream) => {
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });
  }, []);

  const startCall = useCallback(
    async (mode) => {
      if (
        !canStartCall ||
        !conversationRoomId ||
        !remoteUserId ||
        !localUserId ||
        callStateRef.current !== "idle"
      ) {
        return;
      }

      try {
        setCallError("");
        setCallMode(mode);
        setStatusMessage(
          mode === "video"
            ? `Starting video call with ${remoteUserName || "participant"}...`
            : `Starting voice call with ${remoteUserName || "participant"}...`,
        );
        setCallState("outgoing");

        const stream = await prepareLocalStream(mode);
        const peerConnection = createPeerConnection();
        const callId = createCallId();

        addLocalTracks(peerConnection, stream);
        callIdRef.current = callId;
        isInitiatorRef.current = true;
        activeStartedAtRef.current = null;
        callLogSubmittedRef.current = false;

        socket.emit("call:invite", {
          roomId: conversationRoomId,
          fromUserId: localUserId,
          fromUserName: localUserName,
          toUserId: remoteUserId,
          mode,
          callId,
        });

        clearCallTimeout();
        callTimeoutRef.current = window.setTimeout(() => {
          void endCall({
            notifyPeer: true,
            logStatus: "missed",
            errorMessage: `${
              remoteUserName || "The other participant"
            } did not answer.`,
          });
        }, CALL_TIMEOUT_MS);
      } catch (error) {
        console.error("Failed to start call", error);
        resetCallState({
          errorMessage:
            "We couldn't access your camera or microphone for this call.",
        });
      }
    },
    [
      addLocalTracks,
      canStartCall,
      clearCallTimeout,
      conversationRoomId,
      createPeerConnection,
      endCall,
      localUserId,
      localUserName,
      prepareLocalStream,
      remoteUserId,
      remoteUserName,
      resetCallState,
      socket,
    ],
  );

  const acceptCall = useCallback(async () => {
    const pendingCall = incomingCallRef.current;

    if (!pendingCall) {
      return;
    }

    try {
      setCallError("");
      setCallMode(pendingCall.mode);
      setStatusMessage(
        `Connecting to ${pendingCall.fromUserName || "participant"}...`,
      );
      setCallState("connecting");

      const stream = await prepareLocalStream(pendingCall.mode);
      const peerConnection = createPeerConnection();

      addLocalTracks(peerConnection, stream);
      callIdRef.current = pendingCall.callId || callIdRef.current || createCallId();
      isInitiatorRef.current = false;
      activeStartedAtRef.current = null;
      callLogSubmittedRef.current = false;
      setIncomingCall(null);

      socket.emit("call:accept", {
        roomId: pendingCall.roomId,
        fromUserId: localUserId,
        fromUserName: localUserName,
        toUserId: pendingCall.fromUserId,
        mode: pendingCall.mode,
        callId: callIdRef.current,
      });
    } catch (error) {
      console.error("Failed to accept call", error);
      resetCallState({
        errorMessage:
          "We couldn't access your camera or microphone for this call.",
      });
    }
  }, [
    addLocalTracks,
    createPeerConnection,
    localUserId,
    localUserName,
    prepareLocalStream,
    resetCallState,
    socket,
  ]);

  const declineCall = useCallback(() => {
    const pendingCall = incomingCallRef.current;

    if (pendingCall?.roomId) {
      socket.emit("call:decline", {
        roomId: pendingCall.roomId,
        fromUserId: localUserId,
        fromUserName: localUserName,
        toUserId: pendingCall.fromUserId,
        callId: pendingCall.callId || callIdRef.current,
      });
    }

    resetCallState();
  }, [localUserId, localUserName, resetCallState, socket]);

  const toggleMicrophone = useCallback(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() || [];

    if (audioTracks.length === 0) {
      return;
    }

    const nextEnabled = !audioTracks[0].enabled;

    audioTracks.forEach((track) => {
      track.enabled = nextEnabled;
    });

    setIsMicEnabled(nextEnabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];

    if (videoTracks.length === 0) {
      return;
    }

    const nextEnabled = !videoTracks[0].enabled;

    videoTracks.forEach((track) => {
      track.enabled = nextEnabled;
    });

    setIsCameraEnabled(nextEnabled);
  }, []);

  useEffect(() => {
    if (!conversationRoomId) {
      const timerId = window.setTimeout(() => {
        resetCallState();
      }, 0);

      return () => {
        window.clearTimeout(timerId);
      };
    }

    socket.emit("chat:join-room", { roomId: conversationRoomId });

    return () => {
      if (callStateRef.current !== "idle") {
        socket.emit("call:end", {
          roomId: conversationRoomId,
          fromUserId: localUserId,
          toUserId: remoteUserIdRef.current,
          callId: callIdRef.current,
        });
      }

      socket.emit("chat:leave-room", { roomId: conversationRoomId });
      resetCallState();
    };
  }, [conversationRoomId, localUserId, resetCallState, socket]);

  useEffect(() => {
    const matchesCallPayload = (payload) => {
      if (
        payload?.roomId !== roomIdRef.current ||
        payload?.toUserId !== localUserId ||
        payload?.fromUserId !== remoteUserIdRef.current
      ) {
        return false;
      }

      if (callIdRef.current && payload?.callId && payload.callId !== callIdRef.current) {
        return false;
      }

      return true;
    };

    const handleCallInvite = (payload) => {
      if (
        payload?.roomId !== roomIdRef.current ||
        payload?.toUserId !== localUserId ||
        payload?.fromUserId !== remoteUserIdRef.current
      ) {
        return;
      }

      if (callStateRef.current !== "idle") {
        socket.emit("call:decline", {
          roomId: payload.roomId,
          fromUserId: localUserId,
          fromUserName: localUserName,
          toUserId: payload.fromUserId,
          reason: "busy",
          callId: payload.callId,
        });
        return;
      }

      callIdRef.current = payload.callId || "";
      isInitiatorRef.current = false;
      activeStartedAtRef.current = null;
      callLogSubmittedRef.current = false;
      setCallError("");
      setIncomingCall(payload);
      setCallMode(payload.mode);
      setStatusMessage(`${payload.fromUserName || "Someone"} is calling...`);
      setCallState("incoming");
    };

    const handleCallAccepted = async (payload) => {
      if (callStateRef.current !== "outgoing" || !matchesCallPayload(payload)) {
        return;
      }

      try {
        clearCallTimeout();
        setCallState("connecting");
        setStatusMessage(
          `Connecting to ${payload.fromUserName || "participant"}...`,
        );

        if (payload.callId) {
          callIdRef.current = payload.callId;
        }

        const peerConnection = createPeerConnection();
        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        socket.emit("call:offer", {
          roomId: payload.roomId,
          fromUserId: localUserId,
          toUserId: payload.fromUserId,
          callId: callIdRef.current,
          offer,
        });
      } catch (error) {
        console.error("Failed to create offer", error);
        void endCall({
          notifyPeer: true,
          errorMessage: "Unable to connect this call right now.",
        });
      }
    };

    const handleCallOffer = async (payload) => {
      if (callStateRef.current === "idle" || !matchesCallPayload(payload)) {
        return;
      }

      try {
        if (payload.callId) {
          callIdRef.current = payload.callId;
        }

        const peerConnection = createPeerConnection();

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(payload.offer),
        );
        await flushPendingCandidates();

        const answer = await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(answer);

        socket.emit("call:answer", {
          roomId: payload.roomId,
          fromUserId: localUserId,
          toUserId: payload.fromUserId,
          callId: callIdRef.current,
          answer,
        });
      } catch (error) {
        console.error("Failed to handle offer", error);
        void endCall({
          notifyPeer: true,
          errorMessage: "Unable to answer this call right now.",
        });
      }
    };

    const handleCallAnswer = async (payload) => {
      if (callStateRef.current === "idle" || !matchesCallPayload(payload)) {
        return;
      }

      try {
        if (payload.callId) {
          callIdRef.current = payload.callId;
        }

        const peerConnection = createPeerConnection();

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(payload.answer),
        );
        await flushPendingCandidates();
      } catch (error) {
        console.error("Failed to handle answer", error);
        void endCall({
          notifyPeer: true,
          errorMessage: "Unable to establish this call.",
        });
      }
    };

    const handleIceCandidate = async (payload) => {
      if (
        callStateRef.current === "idle" ||
        !payload?.candidate ||
        !matchesCallPayload(payload)
      ) {
        return;
      }

      if (payload.callId) {
        callIdRef.current = payload.callId;
      }

      const candidate = new RTCIceCandidate(payload.candidate);
      const peerConnection = peerConnectionRef.current;

      if (!peerConnection || !peerConnection.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    };

    const handleCallDeclined = async (payload) => {
      if (callStateRef.current === "idle" || !matchesCallPayload(payload)) {
        return;
      }

      clearCallTimeout();

      if (payload.callId) {
        callIdRef.current = payload.callId;
      }

      if (isInitiatorRef.current && !callLogSubmittedRef.current) {
        await persistCallLog("declined");
      }

      resetCallState({
        errorMessage:
          payload.reason === "busy"
            ? `${
                payload.fromUserName ||
                remoteUserNameRef.current ||
                "The other participant"
              } is already on another call.`
            : `${
                payload.fromUserName ||
                remoteUserNameRef.current ||
                "The other participant"
              } declined the call.`,
      });
    };

    const handleCallEnded = async (payload) => {
      if (callStateRef.current === "idle" || !matchesCallPayload(payload)) {
        return;
      }

      if (payload.callId) {
        callIdRef.current = payload.callId;
      }

      if (isInitiatorRef.current && !callLogSubmittedRef.current) {
        await persistCallLog(
          activeStartedAtRef.current ? "completed" : "canceled",
        );
      }

      resetCallState();
    };

    socket.on("call:invite", handleCallInvite);
    socket.on("call:accept", handleCallAccepted);
    socket.on("call:offer", handleCallOffer);
    socket.on("call:answer", handleCallAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:decline", handleCallDeclined);
    socket.on("call:end", handleCallEnded);

    return () => {
      socket.off("call:invite", handleCallInvite);
      socket.off("call:accept", handleCallAccepted);
      socket.off("call:offer", handleCallOffer);
      socket.off("call:answer", handleCallAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:decline", handleCallDeclined);
      socket.off("call:end", handleCallEnded);
    };
  }, [
    clearCallTimeout,
    createPeerConnection,
    endCall,
    flushPendingCandidates,
    localUserId,
    localUserName,
    persistCallLog,
    resetCallState,
    socket,
  ]);

  const callActionsDisabled = useMemo(
    () =>
      !conversationRoomId ||
      !remoteUserId ||
      !localUserId ||
      !canStartCall ||
      callState !== "idle",
    [callState, canStartCall, conversationRoomId, localUserId, remoteUserId],
  );

  return {
    callState,
    callMode,
    callError,
    statusMessage,
    incomingCall,
    localStream,
    remoteStream,
    isMicEnabled,
    isCameraEnabled,
    canToggleCamera:
      callMode === "video" && Boolean(localStream?.getVideoTracks?.().length),
    callActionsDisabled,
    startAudioCall: () => startCall("audio"),
    startVideoCall: () => startCall("video"),
    acceptCall,
    declineCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
  };
}
