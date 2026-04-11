import { useEffect, useRef } from "react";

function PhoneIcon({ className = "h-5 w-5" }) {
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

function VideoIcon({ className = "h-5 w-5" }) {
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

function MicOffIcon({ className = "h-5 w-5" }) {
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
      <path d="m2 2 20 20" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <path d="M15 9.34V7a3 3 0 1 0-6 0v.34" />
      <path d="M17 16.95A7 7 0 0 1 5 12" />
      <path d="M12 19v3" />
      <path d="M8 22h8" />
    </svg>
  );
}

function CameraOffIcon({ className = "h-5 w-5" }) {
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
      <path d="m2 2 20 20" />
      <path d="M10.66 6H14l2 2h2a2 2 0 0 1 2 2v5.34" />
      <path d="M16.24 16.24A6 6 0 0 1 7.76 7.76" />
      <path d="M6 6.34A2 2 0 0 0 4 8v8a2 2 0 0 0 2 2h12" />
    </svg>
  );
}

function CameraIcon({ className = "h-5 w-5" }) {
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
      <path d="M14 6h.01" />
      <path d="M4 8a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function ActionButton({
  children,
  onClick,
  className,
  label,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export default function ConversationCallPanel({
  participantName,
  callState,
  callMode,
  statusMessage,
  localStream,
  remoteStream,
  isMicEnabled,
  isCameraEnabled,
  canToggleCamera,
  onAcceptCall,
  onDeclineCall,
  onEndCall,
  onToggleMicrophone,
  onToggleCamera,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  if (callState === "idle") {
    return null;
  }

  if (callState === "incoming") {
    return (
      <>
        <audio ref={remoteAudioRef} autoPlay />

        <div className="fixed bottom-6 right-6 z-50 w-[22rem] overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-500 px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Incoming {callMode === "video" ? "video" : "voice"} call
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/20 animate-pulse">
                {callMode === "video" ? (
                  <VideoIcon className="h-7 w-7" />
                ) : (
                  <PhoneIcon className="h-7 w-7" />
                )}
              </div>

              <div>
                <p className="text-lg font-semibold">{participantName}</p>
                <p className="text-sm text-white/80">
                  {statusMessage || "Tap to answer or decline"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 bg-white px-5 py-4">
            <ActionButton
              onClick={onDeclineCall}
              className="bg-red-500 text-white hover:bg-red-600"
              label="Decline call"
            >
              <PhoneIcon className="h-5 w-5 rotate-[135deg]" />
            </ActionButton>
            <ActionButton
              onClick={onAcceptCall}
              className="bg-emerald-500 text-white hover:bg-emerald-600"
              label="Accept call"
            >
              <PhoneIcon />
            </ActionButton>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="mb-4 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg">
      <audio ref={remoteAudioRef} autoPlay />

      {callMode === "video" ? (
        <div className="relative aspect-video bg-slate-900">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
              <VideoIcon className="h-10 w-10 text-white/80" />
              <p className="text-lg font-semibold">{participantName}</p>
              <p className="text-sm text-white/70">
                {statusMessage || "Preparing video call..."}
              </p>
            </div>
          )}

          {localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-4 right-4 h-28 w-40 rounded-2xl border border-white/20 bg-slate-900 object-cover shadow-xl"
            />
          )}
        </div>
      ) : (
        <div className="flex h-72 flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
            <PhoneIcon className="h-10 w-10 text-white" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{participantName}</p>
            <p className="text-sm text-white/70">
              {statusMessage || "Preparing voice call..."}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 bg-slate-900 px-5 py-4">
        <div>
          <p className="font-semibold">{participantName}</p>
          <p className="text-sm text-white/65">
            {statusMessage || "Connecting..."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ActionButton
            onClick={onToggleMicrophone}
            className={`${
              isMicEnabled
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-amber-500/90 text-white hover:bg-amber-500"
            }`}
            label={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {isMicEnabled ? <MicIcon /> : <MicOffIcon />}
          </ActionButton>

          {callMode === "video" && (
            <ActionButton
              onClick={onToggleCamera}
              className={`${
                isCameraEnabled
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-amber-500/90 text-white hover:bg-amber-500"
              }`}
              label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
              disabled={!canToggleCamera}
            >
              {isCameraEnabled ? <CameraIcon /> : <CameraOffIcon />}
            </ActionButton>
          )}

          <ActionButton
            onClick={onEndCall}
            className="bg-red-500 text-white hover:bg-red-600"
            label="End call"
          >
            <PhoneIcon className="h-5 w-5 rotate-[135deg]" />
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
