import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import AdminRoutingControls from "../components/AdminRoutingControls";
import DoctorShell from "../components/DoctorShell";

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
    },
    doctors: [],
    activeAssignments: [],
    unassignedPatients: [],
    pendingAppointments: [],
    criticalVitals: [],
  });
  const [loading, setLoading] = useState(true);
  const [routingState, setRoutingState] = useState({});
  const [feedback, setFeedback] = useState("");

  const fetchDashboard = async () => {
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
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const doctors = useMemo(() => dashboard.doctors || [], [dashboard.doctors]);

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
            title="Unassigned patients"
            value={dashboard.metrics.unassignedPatients}
            subtitle="Patients waiting for admin routing"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard
            title="Unassigned intake"
            subtitle="New patients without an active doctor assignment. Route them here to activate the clinical workflow."
          >
            {loading ? (
              <p className="text-sm text-slate-500">Loading queue...</p>
            ) : dashboard.unassignedPatients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="text-base font-medium text-slate-700">
                  No unassigned patients.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Fresh intake without an active doctor will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.unassignedPatients.map((patient) => (
                  <div
                    key={patient._id}
                    className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold text-slate-900">
                            {patient.name}
                          </p>
                          <Link
                            to={`/admin/patients/${patient._id}`}
                            className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                          >
                            Open profile
                          </Link>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {patient.email}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          Joined {formatDateTime(patient.createdAt)}
                        </p>
                      </div>

                      {renderRoutingControls(patient._id, "", "Route patient")}
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
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        doctor.isOnline
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {doctor.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                        Critical
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">
                        {doctor.criticalVitalCount}
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
            title="Pending appointment queue"
            subtitle="Route or reassign appointments directly from the queue instead of opening a separate screen."
          >
            {dashboard.pendingAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">No pending appointments.</p>
            ) : (
              <div className="space-y-4">
                {dashboard.pendingAppointments.slice(0, 10).map((appointment) => {
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
                            {formatDateTime(appointment.appointmentDate)}
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
            subtitle="Flagged vitals can be rerouted directly here before they escalate further."
          >
            {dashboard.criticalVitals.length === 0 ? (
              <p className="text-sm text-slate-500">No active critical vitals.</p>
            ) : (
              <div className="space-y-4">
                {dashboard.criticalVitals.map((vital) => {
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
        </section>
      </div>
    </DoctorShell>
  );
}
