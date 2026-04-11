import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/api";
import { getCurrentUser, storeCurrentUser } from "../auth";
import DoctorShell from "../components/DoctorShell";
import useUnreadPatientMessages from "../hooks/useUnreadPatientMessages";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function UsersIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function AlertIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ChatIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 10h10" />
      <path d="M7 14h7" />
      <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 1 1 18 0Z" />
    </svg>
  );
}

function ActivityIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 12h-4l-3 9-6-18-3 9H2" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function StatCard({ title, value, subtitle, tone, icon }) {
  const toneClasses = {
    blue: {
      border: "border-slate-200",
      accent: "bg-blue-600",
      icon: "bg-blue-50 text-blue-700",
      text: "text-blue-700",
    },
    emerald: {
      border: "border-slate-200",
      accent: "bg-emerald-600",
      icon: "bg-emerald-50 text-emerald-700",
      text: "text-emerald-700",
    },
    rose: {
      border: "border-slate-200",
      accent: "bg-red-600",
      icon: "bg-red-50 text-red-700",
      text: "text-red-700",
    },
    amber: {
      border: "border-slate-200",
      accent: "bg-amber-500",
      icon: "bg-amber-50 text-amber-700",
      text: "text-amber-700",
    },
  };
  const palette = toneClasses[tone] || toneClasses.blue;

  return (
    <div className={`rounded-[1.75rem] border bg-white p-5 shadow-sm sm:p-6 ${palette.border}`}>
      <div className={`mb-5 h-1.5 w-16 rounded-full ${palette.accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">{value}</p>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${palette.icon}`}>{icon}</span>
      </div>
      <p className={`mt-4 text-sm leading-6 ${palette.text}`}>{subtitle}</p>
    </div>
  );
}

function CommandLink({ title, subtitle, to, icon, badge, tone = "light" }) {
  const isPrimary = tone === "primary";

  return (
    <Link
      to={to}
      className={`group relative flex min-h-[5.5rem] flex-col justify-between rounded-3xl border p-3.5 transition sm:min-h-[7.25rem] sm:p-5 ${
        isPrimary
          ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl sm:h-10 sm:w-10 ${isPrimary ? "bg-white/15" : "bg-white text-blue-700 shadow-sm"}`}>{icon}</span>
        {badge ? (
          <span className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${isPrimary ? "bg-slate-950 text-white" : "bg-blue-100 text-blue-700"}`}>
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-3 sm:mt-5">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-semibold sm:text-base">{title}</p>
          <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-1 sm:h-4 sm:w-4" />
        </div>
        <p className={`mt-1.5 text-xs leading-5 sm:mt-2 sm:text-sm sm:leading-6 ${isPrimary ? "text-blue-100" : "text-slate-500"}`}>{subtitle}</p>
      </div>
    </Link>
  );
}

function QueueCard({ title, subtitle, tone, action, children }) {
  return (
    <section className={`rounded-[2rem] border p-5 shadow-sm sm:p-6 ${tone === "rose" ? "border-red-100 bg-white" : "border-slate-200 bg-white"}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const getPatientId = (patient) => {
  if (!patient) return null;
  return typeof patient === "string" ? patient : patient._id;
};

const getVitalSummary = (vital) => {
  const values = [];
  if (vital.systolic || vital.diastolic) {
    values.push(`BP ${vital.systolic || "-"}/${vital.diastolic || "-"}`);
  }
  if (vital.glucoseLevel) {
    values.push(`Glucose ${vital.glucoseLevel}`);
  }
  return values.join(" | ") || "Critical vital reading";
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Schedule pending";
  }
  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

function Dashboard() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { totalUnreadConversations, unreadCountsByPatient } =
    useUnreadPatientMessages();
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    alerts: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [availability, setAvailability] = useState(
    currentUser?.isOnline !== false,
  );
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [resolvingAlertId, setResolvingAlertId] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await API.get("/dashboard");
        setStats({
          patients: res.data.totalPatients,
          appointments: res.data.pendingAppointments,
          alerts: res.data.flaggedVitals,
        });
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAppointments = async () => {
      try {
        const res = await API.get("/appointments");
        setAppointments(res.data.appointments || []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchVitals = async () => {
      try {
        const res = await API.get("/vitals/latest");
        setVitals(res.data.vitals || []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAlerts = async () => {
      try {
        const res = await API.get("/vitals/alerts");
        setAlerts(res.data || []);
        setStats((prev) => ({
          ...prev,
          alerts: res.data.length,
        }));
      } catch (err) {
        console.error(err);
      }
    };

    const fetchPatients = async () => {
      try {
        const res = await API.get("/patients");
        setPatients(res.data.patients || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchDashboard();
    fetchAppointments();
    fetchVitals();
    fetchAlerts();
    fetchPatients();

    socket.on("criticalAlert", (data) => {
      if (data.vital) {
        setAlerts((prev) => {
          const nextAlerts = [
            data.vital,
            ...prev.filter((alert) => alert._id !== data.vital._id),
          ];

          setStats((prevStats) => ({
            ...prevStats,
            alerts: nextAlerts.length,
          }));

          return nextAlerts;
        });

        if (data.vital.patient?._id) {
          setPatients((prev) => {
            const exists = prev.some(
              (patient) => patient._id === data.vital.patient._id,
            );

            return exists ? prev : [data.vital.patient, ...prev];
          });
        }
      }
    });

    return () => {
      socket.off("criticalAlert");
    };
  }, []);

  const toggleAvailability = async () => {
    setUpdatingAvailability(true);

    try {
      const nextAvailability = !availability;
      const res = await API.patch("/doctors/availability", {
        isOnline: nextAvailability,
      });

      setAvailability(res.data.doctor.isOnline);

      const doctor = res.data.doctor;
      storeCurrentUser({
        ...(getCurrentUser() || {}),
        ...doctor,
        id: doctor.id,
      });
    } catch (error) {
      console.error("Failed to update doctor availability", error);
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const openAppointmentChat = (appointment) => {
    const patientId = getPatientId(appointment.patient);
    if (!patientId) return;
    navigate(`/patients/${patientId}?chat=1&appointment=${appointment._id}`);
  };

  const openAlertChat = async (alert) => {
    const patientId = getPatientId(alert.patient);
    if (!patientId || resolvingAlertId) return;

    setResolvingAlertId(alert._id);

    try {
      await API.patch(`/vitals/review/${alert._id}`);

      setAlerts((prev) => {
        const nextAlerts = prev.filter((item) => item._id !== alert._id);
        setStats((prevStats) => ({
          ...prevStats,
          alerts: nextAlerts.length,
        }));

        if (nextAlerts.length === 0) {
          setShowAlertDetails(false);
        }

        return nextAlerts;
      });

      navigate(`/patients/${patientId}?chat=1&alert=${alert._id}`);
    } catch (error) {
      console.error("Failed to resolve critical alert", error);
    } finally {
      setResolvingAlertId(null);
    }
  };

  const chartData = vitals.map((vital) => {
    const systolic =
      vital.systolic ||
      (vital.bloodPressure
        ? parseInt(vital.bloodPressure.split("/")[0], 10)
        : 0);

    return {
      name: vital.patient?.name || "Patient",
      systolic,
      glucose: vital.glucoseLevel || vital.bloodSugar || 0,
    };
  });

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    const activeAppointments = appointments
      .filter((appointment) => {
        const timestamp = new Date(appointment.appointmentDate).getTime();
        return Number.isFinite(timestamp) && timestamp >= now;
      })
      .sort(
        (left, right) =>
          new Date(left.appointmentDate).getTime() -
          new Date(right.appointmentDate).getTime(),
      );

    return activeAppointments[0] || appointments[0] || null;
  }, [appointments]);

  const patientsNeedingAttention = useMemo(
    () =>
      patients
        .map((patient) => ({
          ...patient,
          unread: unreadCountsByPatient[patient._id] || 0,
        }))
        .sort((left, right) => right.unread - left.unread)
        .slice(0, 5),
    [patients, unreadCountsByPatient],
  );

  const unresolvedPatientCount = useMemo(
    () =>
      Object.values(unreadCountsByPatient).filter((count) => count > 0).length,
    [unreadCountsByPatient],
  );

  const latestCriticalAlert = alerts[0] || null;

  return (
    <DoctorShell
      title="Doctor Dashboard"
      subtitle="Track urgent alerts, patient conversations and follow-up activity from one place."
      actions={
        <button
          type="button"
          onClick={toggleAvailability}
          disabled={updatingAvailability}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            availability
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          {updatingAvailability
            ? "Updating..."
            : availability
              ? "Go offline"
              : "Go online"}
        </button>
      }
    >
      <div className="space-y-6 lg:space-y-7">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-8 lg:px-8 lg:py-9">
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                Care Command Center
              </span>
              <h2 className="mt-3 max-w-3xl text-[1.85rem] font-semibold tracking-tight text-slate-950 sm:mt-4 sm:text-4xl">
                {`Welcome back, Dr. ${currentUser?.name || "Doctor"}.`}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:mt-4 sm:text-base sm:leading-7">
                Triage critical alerts, move through appointments quickly, and
                keep unread patient conversations from going stale.
              </p>

              <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3 sm:grid-cols-3">
                <CommandLink
                  to="/patients"
                  title="Patient queue"
                  subtitle="Move through records and active conversations."
                  tone="primary"
                  badge={totalUnreadConversations > 0 ? totalUnreadConversations : undefined}
                  icon={<UsersIcon />}
                />
                <CommandLink
                  to="/patients"
                  title="Unread chats"
                  subtitle="Open the patient list with unread badges in context."
                  icon={<ChatIcon />}
                  badge={unresolvedPatientCount > 0 ? unresolvedPatientCount : undefined}
                />
                <CommandLink
                  to="/patients"
                  title="Appointment follow-up"
                  subtitle="Jump into consultations waiting for response."
                  icon={<CalendarIcon />}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 sm:rounded-[1.75rem] sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-emerald-700">Availability</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:mt-3 sm:text-2xl">
                      {availability ? "Online for live care" : "Offline from queue"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      availability
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    {availability ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 sm:leading-6 text-slate-600">
                  {availability
                    ? "Patients can book, chat, and reach you for urgent review."
                    : "You are hidden from the online doctor queue until you go back online."}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-red-100 bg-red-50 p-4 sm:rounded-[1.75rem] sm:p-5">
                <p className="text-sm font-medium text-red-700">Immediate priority</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:mt-3 sm:text-2xl">
                  {latestCriticalAlert
                    ? latestCriticalAlert.patient?.name || "Unassigned patient"
                    : "No active alert"}
                </p>
                <p className="mt-2 text-sm leading-5 sm:leading-6 text-slate-600">
                  {latestCriticalAlert
                    ? `${getVitalSummary(latestCriticalAlert)} - ${formatDateTime(
                        latestCriticalAlert.createdAt,
                      )}`
                    : "Your critical queue is currently clear."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Patients"
            value={stats.patients}
            subtitle="Registered patients in your workspace"
            tone="blue"
            icon={<UsersIcon />}
          />
          <StatCard
            title="Pending appointments"
            value={stats.appointments}
            subtitle={
              nextAppointment
                ? `Next: ${formatDateTime(nextAppointment.appointmentDate)}`
                : "No pending appointment in queue"
            }
            tone="amber"
            icon={<CalendarIcon />}
          />
          <StatCard
            title="Critical alerts"
            value={stats.alerts}
            subtitle={
              stats.alerts > 0
                ? "Needs urgent clinical review"
                : "No unresolved critical readings"
            }
            tone="rose"
            icon={<AlertIcon />}
          />
          <StatCard
            title="Unread conversations"
            value={totalUnreadConversations}
            subtitle={
              totalUnreadConversations > 0
                ? `${unresolvedPatientCount} patient conversations waiting`
                : "Inbox is fully attended"
            }
            tone="emerald"
            icon={<ChatIcon />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <QueueCard
            title="Patient focus"
            subtitle="Quick access to patients who currently need review or a response."
            tone="slate"
            action={
              <Link
                to="/patients"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
              >
                Open full patient list
                <ArrowRightIcon />
              </Link>
            }
          >
            {patientsNeedingAttention.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="text-base font-medium text-slate-700">
                  No patients loaded yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Patient records will appear here as they register or send new
                  messages.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {patientsNeedingAttention.map((patient) => (
                  <Link
                    key={patient._id}
                    to={`/patients/${patient._id}`}
                    className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50 sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">
                          {patient.name}
                        </p>
                        {patient.unread > 0 && (
                          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                            {patient.unread}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {patient.email}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {patient.lastAppointment
                          ? `Last appointment ${formatDateTime(
                              patient.lastAppointment,
                            )}`
                          : "No previous appointment recorded"}
                      </p>
                    </div>

                    <span className="hidden text-sm font-medium text-blue-600 sm:inline-flex">
                      Open
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </QueueCard>

          <QueueCard
            title="Critical queue"
            subtitle="Resolve each flagged submission by opening the patient chat."
            tone="rose"
            action={
              <button
                type="button"
                onClick={() => setShowAlertDetails((prev) => !prev)}
                className="rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200"
              >
                {showAlertDetails ? "Collapse queue" : "Open queue"}
              </button>
            }
          >
            {!showAlertDetails ? (
              <div className="rounded-3xl border border-red-100 bg-white px-4 py-6 sm:px-5">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                    <AlertIcon />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {stats.alerts > 0
                        ? `${stats.alerts} alert${stats.alerts === 1 ? "" : "s"} waiting`
                        : "No unresolved alerts"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {latestCriticalAlert
                        ? `Most recent: ${
                            latestCriticalAlert.patient?.name || "Unknown patient"
                          } - ${getVitalSummary(latestCriticalAlert)}`
                        : "When patients submit critical vitals, the queue will show up here."}
                    </p>
                  </div>
                </div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-red-200 bg-white px-4 py-10 text-center">
                <p className="text-base font-medium text-slate-700">
                  No active critical alerts.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  The queue clears automatically as soon as you open and resolve
                  the alert.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const patientId = getPatientId(alert.patient);
                  const patientName = alert.patient?.name || "Unknown patient";

                  return patientId ? (
                    <button
                      key={alert._id}
                      type="button"
                      onClick={() => openAlertChat(alert)}
                      disabled={resolvingAlertId === alert._id}
                      className="block w-full rounded-3xl border border-red-100 bg-white p-4 text-left transition hover:bg-red-50 disabled:opacity-60 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-red-700">
                            {patientName}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {getVitalSummary(alert)}
                          </p>
                          <p className="mt-3 text-xs text-slate-500">
                            {formatDateTime(alert.createdAt)}
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-medium text-red-700">
                          {resolvingAlertId === alert._id
                            ? "Opening..."
                            : "Open chat"}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div
                      key={alert._id}
                      className="rounded-3xl border border-red-100 bg-white p-4"
                    >
                      <p className="font-semibold text-red-700">
                        {patientName}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {getVitalSummary(alert)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </QueueCard>
        </section>

        <QueueCard
          title="Appointment queue"
          subtitle="Open any appointment to jump directly into the patient chat with the reason already in context."
          tone="slate"
        >
          {appointments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-base font-medium text-slate-700">
                No appointments scheduled yet.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                New booking requests will surface here as patients schedule
                appointments.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {appointments.map((appointment) => (
                  <button
                    key={appointment._id}
                    type="button"
                    onClick={() => openAppointmentChat(appointment)}
                    className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {appointment.patient?.name || "Unknown"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(appointment.appointmentDate)}
                        </p>
                      </div>

                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                        {appointment.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-medium text-blue-600">
                      Open chat
                    </p>
                  </button>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                      <th className="py-3 pr-4 font-medium">Patient</th>
                      <th className="py-3 pr-4 font-medium">Scheduled</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 font-medium">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {appointments.map((appointment) => (
                      <tr
                        key={appointment._id}
                        className="cursor-pointer border-b border-slate-100 transition hover:bg-blue-50"
                        onClick={() => openAppointmentChat(appointment)}
                      >
                        <td className="py-4 pr-4 font-medium text-slate-900">
                          {appointment.patient?.name || "Unknown"}
                        </td>

                        <td className="py-4 pr-4 text-slate-600">
                          {formatDateTime(appointment.appointmentDate)}
                        </td>

                        <td className="py-4 pr-4">
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                            {appointment.status}
                          </span>
                        </td>

                        <td className="py-4">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openAppointmentChat(appointment);
                            }}
                            className="text-sm font-medium text-blue-600"
                          >
                            Open chat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </QueueCard>

        <section className="grid gap-6 xl:grid-cols-2">
          <QueueCard
            title="Blood pressure trend"
            subtitle="Latest systolic readings from recent patient submissions."
            tone="slate"
          >
            <div className="h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </QueueCard>

          <QueueCard
            title="Glucose trend"
            subtitle="Glucose changes across the latest monitored patients."
            tone="slate"
          >
            <div className="h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="glucose"
                    stroke="#dc2626"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </QueueCard>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <CalendarIcon />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Next appointment
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {nextAppointment
                    ? nextAppointment.patient?.name || "Unknown patient"
                    : "No upcoming appointment"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {nextAppointment
                    ? formatDateTime(nextAppointment.appointmentDate)
                    : "When new appointments land, the next consult will show here."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ActivityIcon />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Readings monitored
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {vitals.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Recent blood pressure and glucose submissions available for
                  trend review.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <AlertIcon />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Critical response posture
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {alerts.length > 0 ? "Escalated" : "Stable"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {alerts.length > 0
                    ? "At least one patient has a flagged vital requiring review."
                    : "No current flagged submissions in the queue."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DoctorShell>
  );
}

export default Dashboard;
