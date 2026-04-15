import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/api";
import AdminRoutingControls from "../components/AdminRoutingControls";
import DoctorShell from "../components/DoctorShell";
import { SOCKET_URL } from "../config/runtime";

const socket = io(SOCKET_URL, { autoConnect: false });

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function SlaPill({ sla }) {
  if (!sla) {
    return null;
  }

  const toneClasses = {
    on_track: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    due_soon: "border border-amber-200 bg-amber-50 text-amber-700",
    overdue: "border border-orange-200 bg-orange-50 text-orange-700",
    escalated: "border border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[sla.status] || "border border-slate-200 bg-slate-100 text-slate-600"}`}
    >
      {sla.statusLabel}
    </span>
  );
}

function QueueItemTag({ children, tone = "slate" }) {
  const toneClasses = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone] || toneClasses.slate}`}
    >
      {children}
    </span>
  );
}

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

const getAssignmentSourceLabel = (source) => {
  switch (source) {
    case "appointment":
      return "Appointment";
    case "vital":
      return "Vitals";
    case "emergency":
      return "Emergency";
    default:
      return "Manual";
  }
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

const hasDoctor = (record) => Boolean(record?.doctor?._id || record?.doctor);

const getQueueTagTone = (item) => {
  if (item.urgency === "emergency") {
    return "red";
  }

  if (item.urgency === "critical") {
    return "amber";
  }

  return "blue";
};

const getSlaSortRank = (status) => {
  switch (status) {
    case "escalated":
      return 3;
    case "overdue":
      return 2;
    case "due_soon":
      return 1;
    default:
      return 0;
  }
};

const getDoctorStatusBadgeClassName = (status) => {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700";
    case "busy":
      return "bg-amber-50 text-amber-700";
    case "in_consultation":
      return "bg-blue-50 text-blue-700";
    case "on_break":
      return "bg-violet-50 text-violet-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
};

const isEmergencyTriageItem = (item) =>
  item?.sourceType === "alert" &&
  item?.urgency === "emergency" &&
  !item?.doctorId;

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState({
    metrics: {
      totalPatients: 0,
      totalDoctors: 0,
      onlineDoctors: 0,
      activeAssignments: 0,
      unassignedPatients: 0,
      pendingAppointments: 0,
      criticalVitals: 0,
      activeEmergencyAlerts: 0,
    },
    analytics: {
      windowDays: 30,
      avgAssignmentTimeMinutes: 0,
      avgResponseTimeMinutes: 0,
      avgAlertReviewTimeMinutes: 0,
      missedCallRate: 0,
      totalCalls: 0,
      missedCalls: 0,
      totalAssignmentsMeasured: 0,
      totalResponsesMeasured: 0,
      totalAlertReviewsMeasured: 0,
    },
    slaSummary: {
      intakeTotal: 0,
      intakeDueSoon: 0,
      intakeOverdue: 0,
      responseTotal: 0,
      responseDueSoon: 0,
      responseOverdue: 0,
      escalatedItems: 0,
    },
    doctors: [],
    activeAssignments: [],
    unassignedPatients: [],
    intakeQueue: [],
    responseQueue: [],
    pendingAppointments: [],
    criticalVitals: [],
    emergencyAlerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [routingState, setRoutingState] = useState({});
  const [resolvingAlertIds, setResolvingAlertIds] = useState({});
  const [feedback, setFeedback] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await API.get("/admin/dashboard");
      setDashboard(res.data);
      setFeedback("");
    } catch (error) {
      console.error("Failed to load admin dashboard", error);
      setFeedback(
        error.response?.data?.message || "Unable to load admin dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    socket.connect();

    const refreshEmergencyQueues = () => {
      fetchDashboard();
    };

    socket.on("emergencyAlert", refreshEmergencyQueues);
    socket.on("emergency-resolved", refreshEmergencyQueues);
    socket.on("emergency-routed", refreshEmergencyQueues);

    return () => {
      socket.off("emergencyAlert", refreshEmergencyQueues);
      socket.off("emergency-resolved", refreshEmergencyQueues);
      socket.off("emergency-routed", refreshEmergencyQueues);
      socket.disconnect();
    };
  }, [fetchDashboard]);

  const doctors = useMemo(() => dashboard.doctors || [], [dashboard.doctors]);
  const intakeQueue = useMemo(
    () => dashboard.intakeQueue || [],
    [dashboard.intakeQueue],
  );
  const emergencyTriageQueue = useMemo(
    () => intakeQueue.filter(isEmergencyTriageItem),
    [intakeQueue],
  );
  const nonEmergencyIntakeQueue = useMemo(
    () => intakeQueue.filter((item) => !isEmergencyTriageItem(item)),
    [intakeQueue],
  );
  const responseQueue = useMemo(
    () => dashboard.responseQueue || [],
    [dashboard.responseQueue],
  );
  const watchlist = useMemo(() => {
    return [...intakeQueue, ...responseQueue]
      .filter(
        (item) =>
          item.sla?.status &&
          item.sla.status !== "on_track" &&
          !isEmergencyTriageItem(item),
      )
      .sort((left, right) => {
        const rankDiff =
          getSlaSortRank(right.sla?.status) - getSlaSortRank(left.sla?.status);

        if (rankDiff !== 0) {
          return rankDiff;
        }

        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      })
      .slice(0, 8);
  }, [intakeQueue, responseQueue]);
  const assignedPendingAppointments = useMemo(
    () => (dashboard.pendingAppointments || []).filter((appointment) => hasDoctor(appointment)),
    [dashboard.pendingAppointments],
  );
  const assignedCriticalVitals = useMemo(
    () => (dashboard.criticalVitals || []).filter((vital) => hasDoctor(vital)),
    [dashboard.criticalVitals],
  );
  const assignedEmergencyAlerts = useMemo(
    () => (dashboard.emergencyAlerts || []).filter((alert) => hasDoctor(alert)),
    [dashboard.emergencyAlerts],
  );
  const activeEmergencyQueue = useMemo(
    () => [
      ...emergencyTriageQueue.map((item) => ({
        ...item,
        emergencyStage: "triage",
      })),
      ...assignedEmergencyAlerts.map((alert) => ({
        queueId: `active-emergency-${alert._id}`,
        itemId: alert._id,
        patient: alert.patient,
        doctor: alert.doctor || null,
        patientId: alert.patient?._id || alert.patient || null,
        doctorId: alert.doctor?._id || alert.doctor || null,
        sourceType: "alert",
        sourceLabel: "Emergency alert",
        urgency: "emergency",
        summary: alert.message,
        createdAt: alert.createdAt,
        routedAt: alert.routedAt || null,
        sla: alert.sla,
        emergencyStage: "routed",
      })),
    ],
    [assignedEmergencyAlerts, emergencyTriageQueue],
  );

  const getSelectedDoctorId = (patientId, fallbackDoctorId = "") => {
    return routingState[patientId]?.doctorId ?? fallbackDoctorId ?? "";
  };

  const updateRoutingState = (patientId, update) => {
    setRoutingState((prev) => ({
      ...prev,
      [patientId]: {
        ...(prev[patientId] || {}),
        ...update,
      },
    }));
  };

  const routePatient = async (patientId, fallbackDoctorId = "") => {
    const selectedDoctorId = getSelectedDoctorId(patientId, fallbackDoctorId);

    if (!selectedDoctorId) {
      setFeedback("Select a doctor before routing a patient.");
      return;
    }

    updateRoutingState(patientId, { loading: true });

    try {
      await API.post("/admin/route-patient", {
        patientId,
        doctorId: selectedDoctorId,
      });
      setFeedback("Patient routing updated.");
      await fetchDashboard();
    } catch (error) {
      console.error("Failed to route patient", error);
      setFeedback(
        error.response?.data?.message || "Unable to route patient right now.",
      );
    } finally {
      updateRoutingState(patientId, { loading: false });
    }
  };

  const renderRoutingControls = (patientId, fallbackDoctorId = "", submitLabel) => (
    <AdminRoutingControls
      doctors={doctors}
      selectedDoctorId={getSelectedDoctorId(patientId, fallbackDoctorId)}
      onDoctorChange={(doctorId) => updateRoutingState(patientId, { doctorId })}
      onSubmit={() => routePatient(patientId, fallbackDoctorId)}
      isSubmitting={Boolean(routingState[patientId]?.loading)}
      submitLabel={submitLabel}
    />
  );

  const setResolvingAlertState = (alertId, isResolving) => {
    setResolvingAlertIds((prev) => {
      if (isResolving) {
        return {
          ...prev,
          [alertId]: true,
        };
      }

      const next = { ...prev };
      delete next[alertId];
      return next;
    });
  };

  const resolveEmergencyAlert = async (alertId) => {
    const shouldResolve = window.confirm(
      "Close this emergency case without routing it to a doctor?",
    );

    if (!shouldResolve) {
      return;
    }

    setResolvingAlertState(alertId, true);

    try {
      await API.patch(`/alerts/${alertId}/resolve`, {
        resolutionNote: "Resolved by admin after triage assessment.",
      });
      setFeedback("Emergency case closed.");
      await fetchDashboard();
    } catch (error) {
      console.error("Failed to resolve emergency alert", error);
      setFeedback(
        error.response?.data?.message ||
          "Unable to close the emergency case right now.",
      );
    } finally {
      setResolvingAlertState(alertId, false);
    }
  };

  const canResolveEmergencyItem = (item) => isEmergencyTriageItem(item);

  const renderResolveEmergencyButton = (alertId) => (
    <button
      type="button"
      onClick={() => resolveEmergencyAlert(alertId)}
      disabled={Boolean(resolvingAlertIds[alertId])}
      className="inline-flex items-center justify-center rounded-full border border-red-100 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {resolvingAlertIds[alertId] ? "Closing..." : "Close emergency"}
    </button>
  );

  return (
    <DoctorShell
      title="Admin Dashboard"
      subtitle="Triage unassigned intake, rebalance workload, and keep doctor routing under operational control."
    >
      <div className="space-y-6">
        {feedback && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {feedback}
          </div>
        )}

        {activeEmergencyQueue.length > 0 && (
          <section className="rounded-3xl border border-red-100 bg-red-50 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                  Emergency triage
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  Emergency queue
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  These cases stay pinned to the top while any emergency is active, whether it is still in admin triage or already routed to a doctor.
                </p>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Active cases
                </p>
                <p className="mt-1 text-2xl font-semibold text-red-700">
                  {activeEmergencyQueue.length}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {activeEmergencyQueue.map((item) => (
                <div
                  key={item.queueId}
                  className="rounded-2xl border border-red-100 bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-slate-900">
                          {item.patient?.name || "Unknown patient"}
                        </p>
                        <QueueItemTag tone="red">Emergency alert</QueueItemTag>
                        <QueueItemTag tone={item.emergencyStage === "triage" ? "amber" : "blue"}>
                          {item.emergencyStage === "triage"
                            ? "Awaiting triage"
                            : "Routed to doctor"}
                        </QueueItemTag>
                        <SlaPill sla={item.sla} />
                        {item.patientId && (
                          <>
                            <Link
                              to={`/admin/patients/${item.patientId}`}
                              className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                            >
                              Open profile
                            </Link>
                            <Link
                              to={`/patients/${item.patientId}?chat=1`}
                              className="text-sm font-medium text-red-600 transition hover:text-red-700"
                            >
                              Open triage chat
                            </Link>
                          </>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        {item.summary}
                      </p>
                      <p className="mt-2 truncate text-sm text-slate-500">
                        {item.patient?.email}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span>{item.sla?.objective}</span>
                        <span>{item.sla?.deadlineLabel}</span>
                        <span>{item.sla?.ageLabel}</span>
                        <span>
                          {item.doctor?.name
                            ? `Doctor: ${item.doctor.name}`
                            : "No doctor assigned yet"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 xl:items-end">
                      {item.patientId &&
                        renderRoutingControls(
                          item.patientId,
                          item.doctorId || "",
                          item.doctorId ? "Reassign doctor" : "Route to doctor",
                        )}
                      {item.emergencyStage === "triage" &&
                        renderResolveEmergencyButton(item.itemId)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Patients"
            value={dashboard.metrics.totalPatients}
            subtitle="Registered patients across the platform"
          />
          <StatCard
            title="Doctors online"
            value={dashboard.metrics.onlineDoctors}
            subtitle={`${dashboard.metrics.totalDoctors} doctors in total`}
          />
          <StatCard
            title="Active assignments"
            value={dashboard.metrics.activeAssignments}
            subtitle="Patients currently routed to a doctor"
          />
          <StatCard
            title="Intake waiting"
            value={dashboard.slaSummary.intakeTotal}
            subtitle={`${dashboard.metrics.unassignedPatients} patients currently waiting for routing`}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Intake overdue"
            value={dashboard.slaSummary.intakeOverdue}
            subtitle={`${dashboard.slaSummary.intakeDueSoon} more items are close to breach`}
          />
          <StatCard
            title="Response overdue"
            value={dashboard.slaSummary.responseOverdue}
            subtitle={`${dashboard.slaSummary.responseDueSoon} assigned items are nearing breach`}
          />
          <StatCard
            title="Escalated"
            value={dashboard.slaSummary.escalatedItems}
            subtitle="Critical items that have already crossed escalation time"
          />
          <StatCard
            title="Emergency alerts"
            value={dashboard.metrics.activeEmergencyAlerts}
            subtitle="Active emergency cases across the platform"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Avg assignment time"
            value={`${dashboard.analytics.avgAssignmentTimeMinutes} min`}
            subtitle={`${dashboard.analytics.totalAssignmentsMeasured} routed items in the last ${dashboard.analytics.windowDays} days`}
          />
          <StatCard
            title="Avg response time"
            value={`${dashboard.analytics.avgResponseTimeMinutes} min`}
            subtitle={`${dashboard.analytics.totalResponsesMeasured} patient conversations measured`}
          />
          <StatCard
            title="Alert review time"
            value={`${dashboard.analytics.avgAlertReviewTimeMinutes} min`}
            subtitle={`${dashboard.analytics.totalAlertReviewsMeasured} reviewed vitals and resolved emergencies`}
          />
          <StatCard
            title="Missed-call rate"
            value={`${dashboard.analytics.missedCallRate}%`}
            subtitle={`${dashboard.analytics.missedCalls} missed across ${dashboard.analytics.totalCalls} calls`}
          />
        </section>

        <SectionCard
          title="SLA Watchlist"
          subtitle="These items are due soon, overdue, or already escalated. Keep this queue clear before working lower-priority intake."
        >
          {watchlist.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-base font-medium text-slate-700">
                No SLA risks right now.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                New due-soon, overdue, or escalated cases will be surfaced here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {watchlist.map((item) => (
                <div
                  key={item.queueId}
                  className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-slate-900">
                          {item.patient?.name || "Unknown patient"}
                        </p>
                        <QueueItemTag tone={getQueueTagTone(item)}>
                          {item.sourceLabel}
                        </QueueItemTag>
                        <SlaPill sla={item.sla} />
                        {item.patientId && (
                          <Link
                            to={`/admin/patients/${item.patientId}`}
                            className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                          >
                            Open profile
                          </Link>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        {item.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span>{item.sla?.objective}</span>
                        <span>{item.sla?.deadlineLabel}</span>
                        <span>{item.sla?.ageLabel}</span>
                        <span>
                          {item.doctor?.name
                            ? `Current doctor: ${item.doctor.name}`
                            : "Awaiting routing"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 xl:items-end">
                      {item.patientId &&
                        renderRoutingControls(
                          item.patientId,
                          item.doctorId || "",
                          item.doctorId ? "Reassign" : "Assign doctor",
                        )}

                      {canResolveEmergencyItem(item) &&
                        renderResolveEmergencyButton(item.itemId)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard
            title="Unassigned intake"
            subtitle="Appointment requests and critical vitals waiting for doctor routing. Emergency triage is surfaced separately above."
          >
            {loading ? (
              <p className="text-sm text-slate-500">Loading queue...</p>
            ) : nonEmergencyIntakeQueue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="text-base font-medium text-slate-700">
                  No routine intake waiting.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  New appointment requests and critical vitals without an active doctor will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {nonEmergencyIntakeQueue.map((item) => (
                  <div
                    key={item.queueId}
                    className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold text-slate-900">
                            {item.patient?.name || "Unknown patient"}
                          </p>
                          <QueueItemTag tone={getQueueTagTone(item)}>
                            {item.sourceLabel}
                          </QueueItemTag>
                          <SlaPill sla={item.sla} />
                          {item.patientId && (
                            <Link
                              to={`/admin/patients/${item.patientId}`}
                              className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                            >
                              Open profile
                            </Link>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-700">
                          {item.summary}
                        </p>
                        <p className="mt-2 truncate text-sm text-slate-500">
                          {item.patient?.email}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {item.sla?.deadlineLabel} | {item.sla?.ageLabel}
                        </p>
                        {item.appointmentDate && (
                          <p className="mt-1 text-xs text-slate-400">
                            Scheduled for {formatDateTime(item.appointmentDate)}
                          </p>
                        )}
                        {item.preferredDoctor?.name && (
                          <p className="mt-1 text-xs text-slate-400">
                            Preferred doctor: {item.preferredDoctor.name}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 xl:items-end">
                        {item.patientId &&
                          renderRoutingControls(
                            item.patientId,
                            "",
                            "Route patient",
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Doctor load board"
            subtitle="Use online state, assignment count, and critical queue load to decide who should take the next case."
          >
            <div className="space-y-3">
              {dashboard.doctors.map((doctor) => (
                <div
                  key={doctor._id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {doctor.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {doctor.specialty}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getDoctorStatusBadgeClassName(
                        doctor.workloadStatus,
                      )}`}
                    >
                      {doctor.workloadStatusLabel ||
                        (doctor.isOnline ? "Online" : "Offline")}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Assignments
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {doctor.assignmentCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Pending
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {doctor.pendingAppointmentCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Urgent
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {doctor.criticalVitalCount + doctor.emergencyAlertCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        At risk
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {doctor.overdueResponseCount}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <SectionCard
          title="Active assignments"
          subtitle="Reassign any patient directly from the live routing board when coverage or workload shifts."
        >
          {dashboard.activeAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">No active assignments yet.</p>
          ) : (
            <div className="space-y-4">
              {dashboard.activeAssignments.map((assignment) => {
                const patientId = assignment.patient?._id;
                const currentDoctorId = assignment.doctor?._id || "";

                return (
                  <div
                    key={assignment._id}
                    className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold text-slate-900">
                            {assignment.patient?.name || "Unknown patient"}
                          </p>
                          {patientId && (
                            <Link
                              to={`/admin/patients/${patientId}`}
                              className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                            >
                              Open profile
                            </Link>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Current doctor: {assignment.doctor?.name || "Unassigned"}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          Source {getAssignmentSourceLabel(assignment.source)} | Last routed{" "}
                          {formatDateTime(assignment.lastRoutedAt || assignment.updatedAt)}
                        </p>
                      </div>

                      {patientId &&
                        renderRoutingControls(
                          patientId,
                          currentDoctorId,
                          "Reassign",
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <section className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Appointment response queue"
            subtitle="Pending appointments already routed to a doctor. Use the SLA state to rebalance slow responses before they breach."
          >
            {assignedPendingAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">No pending appointments.</p>
            ) : (
              <div className="space-y-4">
                {assignedPendingAppointments.slice(0, 10).map((appointment) => {
                  const patientId = appointment.patient?._id;
                  const currentDoctorId = appointment.doctor?._id || "";

                  return (
                    <div
                      key={appointment._id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-semibold text-slate-900">
                              {appointment.patient?.name || "Unknown patient"}
                            </p>
                            <QueueItemTag tone="blue">
                              Appointment request
                            </QueueItemTag>
                            <SlaPill sla={appointment.sla} />
                            {patientId && (
                              <Link
                                to={`/admin/patients/${patientId}`}
                                className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                              >
                                Open profile
                              </Link>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            Routed doctor: {appointment.doctor?.name || "Awaiting routing"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Preferred doctor: {appointment.preferredDoctor?.name || "No preference"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {appointment.reason}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            {appointment.sla?.objective} | {appointment.sla?.deadlineLabel} | {appointment.sla?.ageLabel}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Scheduled for {formatDateTime(appointment.appointmentDate)}
                          </p>
                        </div>

                        {patientId &&
                          renderRoutingControls(
                            patientId,
                            currentDoctorId,
                            currentDoctorId ? "Reassign doctor" : "Assign doctor",
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Critical vitals queue"
            subtitle="Critical vitals already routed to a doctor. Overdue and escalated readings should be reassigned immediately."
          >
            {assignedCriticalVitals.length === 0 ? (
              <p className="text-sm text-slate-500">No active critical vitals.</p>
            ) : (
              <div className="space-y-4">
                {assignedCriticalVitals.map((vital) => {
                  const patientId = vital.patient?._id;
                  const currentDoctorId = vital.doctor?._id || "";

                  return (
                    <div
                      key={vital._id}
                      className="rounded-2xl border border-red-100 bg-red-50 p-4"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-semibold text-red-700">
                              {vital.patient?.name || "Unknown patient"}
                            </p>
                            <QueueItemTag tone="amber">Critical vital</QueueItemTag>
                            <SlaPill sla={vital.sla} />
                            {patientId && (
                              <Link
                                to={`/admin/patients/${patientId}`}
                                className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                              >
                                Open profile
                              </Link>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-slate-700">
                            {getVitalSummary(vital)}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {vital.sla?.objective} | {vital.sla?.deadlineLabel} | {vital.sla?.ageLabel}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Routed doctor: {vital.doctor?.name || "Awaiting routing"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(vital.createdAt)}
                          </p>
                        </div>

                        {patientId &&
                          renderRoutingControls(
                            patientId,
                            currentDoctorId,
                            currentDoctorId ? "Reassign doctor" : "Assign doctor",
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {activeEmergencyQueue.length === 0 && assignedEmergencyAlerts.length > 0 && (
          <SectionCard
            title="Emergency alerts queue"
            subtitle="Active emergency alerts already routed to a doctor. These should stay clear or be escalated and reassigned quickly."
          >
            {assignedEmergencyAlerts.length === 0 ? (
              <p className="text-sm text-slate-500">No active emergency alerts.</p>
            ) : (
              <div className="space-y-4">
                {assignedEmergencyAlerts.map((alert) => {
                  const patientId = alert.patient?._id;
                  const currentDoctorId = alert.doctor?._id || "";

                  return (
                    <div
                      key={alert._id}
                      className="rounded-2xl border border-red-100 bg-red-50 p-4"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold text-red-700">
                            {alert.patient?.name || "Unknown patient"}
                          </p>
                          <QueueItemTag tone="red">Emergency alert</QueueItemTag>
                          <SlaPill sla={alert.sla} />
                          {patientId && (
                            <>
                              <Link
                                to={`/admin/patients/${patientId}`}
                                className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                              >
                                Open profile
                              </Link>
                              <Link
                                to={`/patients/${patientId}?chat=1`}
                                className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
                              >
                                Open triage chat
                              </Link>
                            </>
                          )}
                        </div>
                          <p className="mt-2 text-sm text-slate-700">
                            {alert.message}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {alert.sla?.objective} | {alert.sla?.deadlineLabel} | {alert.sla?.ageLabel}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Routed doctor: {alert.doctor?.name || "Awaiting routing"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(alert.createdAt)}
                          </p>
                        </div>

                        {patientId &&
                          renderRoutingControls(
                            patientId,
                            currentDoctorId,
                            currentDoctorId ? "Reassign doctor" : "Assign doctor",
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
          )}
        </section>
      </div>
    </DoctorShell>
  );
}
