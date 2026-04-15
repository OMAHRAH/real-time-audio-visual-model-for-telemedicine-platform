import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../api/api";
import AdminRoutingControls from "../components/AdminRoutingControls";
import DoctorShell from "../components/DoctorShell";
import PatientRecordPanel from "../components/PatientRecordPanel";

const surfaceClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";

const formatDateTime = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getRiskLevel = (latestVital) => {
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

const buildTimeline = ({ vitals, appointments }) => {
  const vitalEvents = vitals.map((vital) => ({
    type: "vital",
    date: vital.createdAt,
    data: vital,
  }));
  const appointmentEvents = appointments.map((appointment) => ({
    type: "appointment",
    date: appointment.appointmentDate,
    data: appointment,
  }));

  return [...vitalEvents, ...appointmentEvents].sort(
    (left, right) => new Date(right.date) - new Date(left.date),
  );
};

export default function AdminPatientProfile() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [profile, setProfile] = useState({
    patient: null,
    vitals: [],
    appointments: [],
    activeAssignment: null,
    assignmentHistory: [],
    alerts: [],
    doctors: [],
  });
  const [timelineLimit, setTimelineLimit] = useState(4);
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [routing, setRouting] = useState(false);
  const [resolvingEmergency, setResolvingEmergency] = useState(false);
  const [hospitalNumberInput, setHospitalNumberInput] = useState("");
  const [assigningHospitalNumber, setAssigningHospitalNumber] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await API.get(`/admin/patients/${id}`);
      setProfile(res.data);
      setSelectedDoctorId(res.data.activeAssignment?.doctor?._id || "");
      setHospitalNumberInput(res.data.patient?.hospitalNumber || "");
      setFeedback("");
    } catch (error) {
      console.error("Failed to load admin patient profile", error);
      setFeedback(
        error.response?.data?.message ||
          "Unable to load this patient profile right now.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const latestVital = profile.vitals[0] || null;
  const activeAlerts = useMemo(
    () => profile.alerts.filter((alert) => alert.status === "active"),
    [profile.alerts],
  );
  const activeTriageEmergency = useMemo(
    () =>
      activeAlerts.find(
        (alert) => alert.type === "emergency" && !(alert.doctor?._id || alert.doctor),
      ) || null,
    [activeAlerts],
  );
  const timeline = useMemo(
    () =>
      buildTimeline({
        vitals: profile.vitals,
        appointments: profile.appointments,
      }),
    [profile.appointments, profile.vitals],
  );

  const routePatient = async () => {
    if (!selectedDoctorId) {
      setFeedback("Select a doctor before updating the assignment.");
      return;
    }

    setRouting(true);

    try {
      await API.post("/admin/route-patient", {
        patientId: id,
        doctorId: selectedDoctorId,
      });
      setFeedback("Patient routing updated.");
      await fetchProfile();
    } catch (error) {
      console.error("Failed to route patient", error);
      setFeedback(
        error.response?.data?.message ||
          "Unable to update the patient routing right now.",
      );
    } finally {
      setRouting(false);
    }
  };

  const resolveEmergency = async () => {
    if (!activeTriageEmergency?._id) {
      return;
    }

    const shouldResolve = window.confirm(
      "Close this emergency case without routing it to a doctor?",
    );

    if (!shouldResolve) {
      return;
    }

    setResolvingEmergency(true);

    try {
      await API.patch(`/alerts/${activeTriageEmergency._id}/resolve`, {
        resolutionNote: "Resolved by admin after triage assessment.",
      });
      setFeedback("Emergency case closed.");
      await fetchProfile();
    } catch (error) {
      console.error("Failed to resolve emergency case", error);
      setFeedback(
        error.response?.data?.message ||
          "Unable to close the emergency case right now.",
      );
    } finally {
      setResolvingEmergency(false);
    }
  };

  const assignHospitalNumber = async (shouldGenerate = false) => {
    setAssigningHospitalNumber(true);

    try {
      const res = await API.patch(`/admin/patients/${id}/hospital-number`, {
        hospitalNumber: shouldGenerate ? "" : hospitalNumberInput,
      });

      const nextHospitalNumber = res.data.patient?.hospitalNumber || "";
      setHospitalNumberInput(nextHospitalNumber);
      setProfile((prev) => ({
        ...prev,
        patient: {
          ...prev.patient,
          hospitalNumber: nextHospitalNumber,
        },
      }));
      setFeedback("Hospital number updated.");
    } catch (error) {
      console.error("Failed to assign hospital number", error);
      setFeedback(
        error.response?.data?.message ||
          "Unable to update hospital number right now.",
      );
    } finally {
      setAssigningHospitalNumber(false);
    }
  };

  return (
    <DoctorShell
      title={profile.patient?.name || "Patient Profile"}
      subtitle="Admin view for routing, assignment history, and read-only clinical context."
    >
      <div className="space-y-6">
        {feedback && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {feedback}
          </div>
        )}

        {loading ? (
          <div className={`p-6 ${surfaceClass}`}>
            <p className="text-sm text-slate-500">Loading patient profile...</p>
          </div>
        ) : (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className={`p-5 sm:p-6 ${surfaceClass}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Admin routing view
                  </span>
                  <Link
                    to="/patients"
                    className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                  >
                    Back to patient list
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Patient</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {profile.patient?.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {profile.patient?.hospitalNumber || "Hospital number not assigned"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {profile.patient?.email}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Joined</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatDateTime(profile.patient?.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {profile.appointments.length} appointments |{" "}
                      {profile.vitals.length} vital submissions
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Current routing</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {profile.activeAssignment?.doctor?.name || "Awaiting assignment"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {profile.activeAssignment
                        ? `Last updated ${formatDateTime(
                            profile.activeAssignment.lastRoutedAt ||
                              profile.activeAssignment.updatedAt,
                          )}`
                        : "No active doctor assignment exists yet."}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Open risk posture</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {getRiskLevel(latestVital)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeAlerts.length} active alert
                      {activeAlerts.length === 1 ? "" : "s"} waiting
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-5 sm:p-6 ${surfaceClass}`}>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Routing controls
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Reassign from here without opening the doctor workflow. This
                  updates the patient’s active appointments, unresolved vitals,
                  and active alerts.
                </p>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Hospital number</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {profile.patient?.hospitalNumber || "Not assigned"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    This becomes the patient-facing record identifier for staff workflows.
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    Assign hospital number
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={hospitalNumberInput}
                      onChange={(event) =>
                        setHospitalNumberInput(
                          event.target.value.toUpperCase().replace(/\s+/g, "-"),
                        )
                      }
                      placeholder="HSP-000123"
                      className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => assignHospitalNumber(false)}
                      disabled={assigningHospitalNumber}
                      className="rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      {assigningHospitalNumber ? "Saving..." : "Save number"}
                    </button>
                    <button
                      type="button"
                      onClick={() => assignHospitalNumber(true)}
                      disabled={assigningHospitalNumber}
                      className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Current doctor</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {profile.activeAssignment?.doctor?.name || "No active assignment"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {profile.activeAssignment?.doctor?.specialty ||
                      "Route this patient to a doctor to activate follow-up."}
                  </p>
                </div>

                <div className="mt-5">
                  <AdminRoutingControls
                    doctors={profile.doctors}
                    selectedDoctorId={selectedDoctorId}
                    onDoctorChange={setSelectedDoctorId}
                    onSubmit={routePatient}
                    isSubmitting={routing}
                    submitLabel={
                      profile.activeAssignment ? "Reassign patient" : "Assign patient"
                    }
                  />
                </div>

                {activeTriageEmergency && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to={`/patients/${id}?chat=1`}
                      className="inline-flex items-center rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
                    >
                      Open live triage chat
                    </Link>
                    <button
                      type="button"
                      onClick={resolveEmergency}
                      disabled={resolvingEmergency}
                      className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {resolvingEmergency ? "Closing..." : "Close emergency"}
                    </button>
                  </div>
                )}

                {activeAlerts.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="font-semibold text-red-700">
                      Active alerts
                    </p>
                    <div className="mt-3 space-y-2">
                      {activeAlerts.slice(0, 3).map((alert) => (
                        <div key={alert._id} className="text-sm text-slate-700">
                          <p>{alert.message}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(alert.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <PatientRecordPanel
              patient={profile.patient}
              latestVital={latestVital}
              getRiskLevel={() => getRiskLevel(latestVital)}
              vitals={profile.vitals}
              timeline={timeline}
              timelineLimit={timelineLimit}
              onTimelineLimitChange={setTimelineLimit}
              appointments={profile.appointments}
              expandedAppointment={expandedAppointment}
              onToggleAppointment={(appointmentId) =>
                setExpandedAppointment((prev) =>
                  prev === appointmentId ? null : appointmentId,
                )
              }
              onSaveNotes={() => {}}
              onCompleteAppointment={() => {}}
              onAutoSaveNotes={() => {}}
              savedNoteId={null}
              readOnly
            />

            <section className={`p-5 sm:p-6 ${surfaceClass}`}>
              <h2 className="text-2xl font-semibold text-slate-950">
                Assignment history
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Every routing event for this patient, including manual admin transfers.
              </p>

              {profile.assignmentHistory.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No assignment history recorded yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {profile.assignmentHistory.map((assignment) => (
                    <div
                      key={assignment._id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {assignment.doctor?.name || "Unknown doctor"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {assignment.doctor?.specialty || "General Medicine"}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            {assignment.note || "No routing note recorded."}
                          </p>
                        </div>

                        <div className="text-sm text-slate-500">
                          <p className="font-medium capitalize text-slate-700">
                            {assignment.status}
                          </p>
                          <p className="mt-1">
                            {formatDateTime(
                              assignment.lastRoutedAt || assignment.updatedAt,
                            )}
                          </p>
                          <p className="mt-1">
                            By {assignment.assignedBy?.name || "System"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DoctorShell>
  );
}
