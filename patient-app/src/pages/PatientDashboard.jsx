import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/api";
import { getPatientId, getStoredUser } from "../auth";
import AppointmentCard from "../components/AppointmentCard";
import useUnreadChats from "../hooks/useUnreadChats";
import { SOCKET_URL } from "../config/runtime";

const socket = io(SOCKET_URL, { autoConnect: false });

function CalendarIcon({ className = "h-5 w-5" }) {
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
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function HeartPulseIcon({ className = "h-5 w-5" }) {
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
      <path d="M19 14a7 7 0 0 1-7 7 7 7 0 0 1-7-7" />
      <path d="M12 21v-4l-3-3 2-2 1 1 3-6 2 4h4" />
      <path d="M7 4a3 3 0 0 0-3 3c0 1.92 1.55 3.76 3.4 5.4L12 17l4.6-4.6C18.45 10.76 20 8.92 20 7a3 3 0 0 0-5.12-2.12L12 7.76 9.12 4.88A3 3 0 0 0 7 4Z" />
    </svg>
  );
}

function ChatBubbleIcon({ className = "h-5 w-5" }) {
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
      <path d="M7 10h10" />
      <path d="M7 14h7" />
      <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 1 1 18 0Z" />
    </svg>
  );
}

function DoctorsIcon({ className = "h-5 w-5" }) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }) {
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function LightningIcon({ className = "h-5 w-5" }) {
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
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

function QuickActionLink({
  to,
  title,
  subtitle,
  tone = "light",
  icon,
  badge,
}) {
  const toneClassName =
    tone === "primary"
      ? "border-white/20 bg-white/14 text-white hover:bg-white/20"
      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50";

  const subtitleClassName =
    tone === "primary" ? "text-blue-100/90" : "text-slate-500";

  return (
    <Link
      to={to}
      className={`group relative flex min-h-[7.5rem] flex-col justify-between rounded-3xl border p-4 transition sm:p-5 ${toneClassName}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
            tone === "primary" ? "bg-white/14" : "bg-slate-100"
          }`}
        >
          {icon}
        </span>

        {badge ? (
          <span
            className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${
              tone === "primary"
                ? "bg-red-500 text-white"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold">{title}</p>
          <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
        <p className={`mt-2 text-sm leading-6 ${subtitleClassName}`}>
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

function MetricCard({ title, value, subtitle, tone, icon }) {
  const toneMap = {
    blue: {
      ring: "border-blue-100",
      iconWrap: "bg-blue-100 text-blue-700",
      chip: "bg-blue-50 text-blue-700",
    },
    emerald: {
      ring: "border-emerald-100",
      iconWrap: "bg-emerald-100 text-emerald-700",
      chip: "bg-emerald-50 text-emerald-700",
    },
    rose: {
      ring: "border-rose-100",
      iconWrap: "bg-rose-100 text-rose-700",
      chip: "bg-rose-50 text-rose-700",
    },
    amber: {
      ring: "border-amber-100",
      iconWrap: "bg-amber-100 text-amber-700",
      chip: "bg-amber-50 text-amber-700",
    },
  };

  const palette = toneMap[tone] || toneMap.blue;

  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${palette.ring}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
            {value}
          </p>
        </div>

        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${palette.iconWrap}`}
        >
          {icon}
        </span>
      </div>

      <p className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium ${palette.chip}`}>
        {subtitle}
      </p>
    </div>
  );
}

function DoctorSpotlightCard({ doctor }) {
  const initials = doctor.name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const statusClassName = doctor.acceptingNewPatients
    ? "bg-emerald-50 text-emerald-700"
    : doctor.isOnline
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-500";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-sm font-semibold text-blue-700">
            {initials || "DR"}
          </div>

          <div>
            <p className="font-semibold text-slate-900">{doctor.name}</p>
            <p className="mt-1 text-sm text-slate-500">{doctor.specialty}</p>
          </div>
        </div>

        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClassName}`}>
          {doctor.workloadStatusLabel || (doctor.isOnline ? "Online" : "Offline")}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to={`/appointments/new?doctor=${doctor._id}`}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Prefer for visit
          <ArrowRightIcon />
        </Link>

        <Link
          to={`/chat?doctor=${doctor._id}`}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
            doctor.isOnline
              ? "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          }`}
          aria-disabled={!doctor.isOnline}
          onClick={(event) => {
            if (!doctor.isOnline) {
              event.preventDefault();
            }
          }}
        >
          Open chat
        </Link>
      </div>
    </div>
  );
}

const formatShortDateTime = (dateValue) => {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return "Schedule pending";
  }

  return parsed.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getLatestBloodPressure = (latestVital) => {
  if (!latestVital) {
    return "No data";
  }

  return `${latestVital.systolic || "-"} / ${latestVital.diastolic || "-"}`;
};

export default function PatientDashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const patientId = getPatientId();
  const { totalUnreadConversations } = useUnreadChats();
  const [latestVital, setLatestVital] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emergencyState, setEmergencyState] = useState({
    loading: false,
    message: "",
    contactId: "",
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [vitalsRes, appointmentsRes, doctorsRes] = await Promise.all([
          API.get(`/vitals/patient/${patientId}`),
          API.get("/appointments"),
          API.get("/doctors?available=true"),
        ]);

        const doctors = doctorsRes.data.doctors ?? [];
        setLatestVital(vitalsRes.data.vitals?.[0] ?? null);
        setAppointments(appointmentsRes.data.appointments ?? []);
        setAvailableDoctors(doctors);
      } catch (error) {
        console.error("Failed to load patient dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchDashboard();
    }
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      return undefined;
    }

    socket.connect();

    const handleEmergencyResolved = (payload) => {
      if (String(payload?.patientId || "") !== patientId) {
        return;
      }

      setEmergencyState({
        loading: false,
        message: "Emergency case closed by admin.",
        contactId: "",
      });
    };

    const handleEmergencyRouted = (payload) => {
      if (String(payload?.patientId || "") !== patientId) {
        return;
      }

      setEmergencyState({
        loading: false,
        message: "Your emergency case has been handed to a doctor.",
        contactId: String(payload?.doctorId || ""),
      });
    };

    socket.on("emergency-resolved", handleEmergencyResolved);
    socket.on("emergency-routed", handleEmergencyRouted);

    return () => {
      socket.off("emergency-resolved", handleEmergencyResolved);
      socket.off("emergency-routed", handleEmergencyRouted);
      socket.disconnect();
    };
  }, [patientId]);

  const activeAppointments = useMemo(
    () =>
      appointments.filter((appointment) =>
        ["pending", "approved", "scheduled", "confirmed"].includes(
          String(appointment.status || "").toLowerCase(),
        ),
      ),
    [appointments],
  );

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    const futureAppointments = activeAppointments
      .filter((appointment) => {
        const timestamp = new Date(appointment.appointmentDate).getTime();

        return Number.isFinite(timestamp) && timestamp >= now;
      })
      .sort(
        (left, right) =>
          new Date(left.appointmentDate).getTime() -
          new Date(right.appointmentDate).getTime(),
      );

    if (futureAppointments.length > 0) {
      return futureAppointments[0];
    }

    return activeAppointments[0] || null;
  }, [activeAppointments]);

  const latestVitalStatus = latestVital
    ? latestVital.flagged
      ? "Doctor already alerted from latest reading"
      : "Latest reading looks stable"
    : "No vitals submitted yet";

  const latestVitalStatusTone = latestVital?.flagged ? "rose" : "emerald";

  const sendEmergencyAlert = async () => {
    setEmergencyState({
      loading: true,
      message: "",
      contactId: "",
    });

    try {
      const res = await API.post("/alerts/emergency");
      const activeContactId = res.data?.activeContact?._id || "";

      setEmergencyState({
        loading: false,
        message: res.data.message || "Emergency alert sent",
        contactId: activeContactId,
      });
    } catch (error) {
      setEmergencyState({
        loading: false,
        message:
          error.response?.data?.message ||
          "Unable to send emergency alert right now.",
        contactId: "",
      });
    }
  };

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500 px-5 py-6 text-white shadow-xl sm:px-6 sm:py-8 lg:px-8 lg:py-9">
        <div className="absolute inset-0">
          <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-50">
              Personal Care Desk
            </span>

            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back, {user?.name || "Patient"}.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50/90 sm:text-base">
              Keep appointments, vitals, doctor access, and emergency support in
              one polished workflow designed for fast daily check-ins.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <QuickActionLink
                to="/appointments/new"
                title="Book appointment"
                subtitle="Reserve a consultation with available doctors."
                tone="primary"
                icon={<CalendarIcon />}
              />
              <QuickActionLink
                to="/vitals"
                title="Submit vitals"
                subtitle="Send blood pressure and glucose readings."
                tone="primary"
                icon={<HeartPulseIcon />}
              />
              <QuickActionLink
                to="/chat"
                title="Open chat"
                subtitle="Reply to doctors and continue consultations."
                tone="primary"
                icon={<ChatBubbleIcon />}
                badge={
                  totalUnreadConversations > 0
                    ? totalUnreadConversations
                    : undefined
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.75rem] border border-white/15 bg-white/12 p-5 backdrop-blur">
              <p className="text-sm font-medium text-blue-50/85">
                Next visit
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {nextAppointment
                  ? formatShortDateTime(nextAppointment.appointmentDate)
                  : "No visit booked"}
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-50/80">
                {nextAppointment
                  ? `Doctor ${
                      nextAppointment.doctor?.name ||
                      nextAppointment.preferredDoctor?.name ||
                      "will be assigned"
                    } - ${
                      nextAppointment.doctor
                        ? String(nextAppointment.status || "pending")
                        : "awaiting admin routing"
                    }`
                  : "Use the appointment flow to reserve your next consultation."}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/15 bg-slate-950/20 p-5 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-50/85">
                    Care pulse
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    {latestVital ? getLatestBloodPressure(latestVital) : "--"}
                  </p>
                </div>

                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  {availableDoctors.length} doctor
                  {availableDoctors.length === 1 ? "" : "s"} available
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-blue-50/80">
                {latestVital
                  ? `Glucose ${latestVital.glucoseLevel || "--"} - ${latestVitalStatus}`
                  : "Your latest submission will appear here after you log it."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Available doctors"
          value={availableDoctors.length}
          subtitle={
            availableDoctors.length > 0
              ? "Ready for instant booking and live chat"
              : "No doctors are marked available right now"
          }
          tone="blue"
          icon={<DoctorsIcon />}
        />

        <MetricCard
          title="Active appointments"
          value={activeAppointments.length}
          subtitle={
            nextAppointment
              ? `Next: ${formatShortDateTime(nextAppointment.appointmentDate)}`
              : "Nothing scheduled yet"
          }
          tone="amber"
          icon={<CalendarIcon />}
        />

        <MetricCard
          title="Latest blood pressure"
          value={getLatestBloodPressure(latestVital)}
          subtitle={latestVitalStatus}
          tone={latestVitalStatusTone}
          icon={<HeartPulseIcon />}
        />

        <MetricCard
          title="Unread doctor replies"
          value={totalUnreadConversations}
          subtitle={
            totalUnreadConversations > 0
              ? "Open chat to review unattended replies"
              : "No unread messages waiting"
          }
          tone="emerald"
          icon={<ChatBubbleIcon />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-blue-600">
                Available Doctors
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Ready for consultation
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                Reach doctors who are marked available for new patient requests right now.
              </p>
            </div>

            <Link
              to="/appointments/new"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
            >
              Search all doctors
              <ArrowRightIcon />
            </Link>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Loading doctors...
            </div>
          ) : availableDoctors.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-base font-medium text-slate-700">
                No doctors are currently available.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                You can still schedule an appointment for later from the booking
                screen.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableDoctors.slice(0, 4).map((doctor) => (
                <DoctorSpotlightCard key={doctor._id} doctor={doctor} />
              ))}
            </div>
          )}
        </div>

        <div className="emergency-panel overflow-hidden rounded-[2rem] border border-rose-200 bg-gradient-to-br from-rose-100 via-rose-50 to-orange-100 shadow-sm">
          <div className="emergency-panel-header border-b border-rose-100 px-5 py-5 sm:px-6">
            <span className="emergency-panel-badge inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
              Emergency Support
            </span>
            <h3 className="emergency-panel-title mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              Escalate urgent symptoms immediately
            </h3>
            <p className="emergency-panel-copy mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Use this only when you need rapid intervention from the care team.
            </p>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="emergency-panel-note rounded-3xl border border-rose-100 bg-white/80 p-4 backdrop-blur sm:p-5">
              <div className="flex items-start gap-3">
                <span className="emergency-panel-icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <LightningIcon />
                </span>
                <div>
                  <p className="emergency-panel-note-title font-medium text-slate-900">
                    Priority routing
                  </p>
                  <p className="emergency-panel-note-copy mt-1 text-sm leading-6 text-slate-600">
                    Emergency requests now go to admin triage first so the
                    situation can be assessed properly before a doctor is pulled
                    in. If intervention is needed, admin routes the case with
                    your existing chat history attached.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={sendEmergencyAlert}
              disabled={emergencyState.loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              <LightningIcon className="h-4 w-4" />
              {emergencyState.loading
                ? "Sending emergency alert..."
                : "Push emergency button"}
            </button>

            {emergencyState.message && (
              <div className="emergency-panel-feedback rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                <p>{emergencyState.message}</p>
                {emergencyState.contactId && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/chat?doctor=${emergencyState.contactId}`)
                    }
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
                  >
                    Open emergency chat
                    <ArrowRightIcon />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-600">
              Appointment Feed
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Recent appointments
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
              Review your latest bookings and any notes from doctors.
            </p>
          </div>

          <Link
            to="/appointments"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
          >
            View full history
            <ArrowRightIcon />
          </Link>
        </div>

        {appointments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <p className="text-base font-medium text-slate-700">
              No appointments yet.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Book your first consultation to start your care timeline.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {appointments.slice(0, 4).map((appointment) => (
              <AppointmentCard key={appointment._id} appointment={appointment} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
