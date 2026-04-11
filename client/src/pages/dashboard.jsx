import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/api";
import { getCurrentUser, storeCurrentUser } from "../auth";
import DoctorShell from "../components/DoctorShell";
import useUnreadPatientMessages from "../hooks/useUnreadPatientMessages";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const surfaceClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";

function Dashboard() {
  const navigate = useNavigate();
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
    getCurrentUser()?.isOnline !== false,
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

      const currentUser = getCurrentUser() || {};
      storeCurrentUser({
        ...currentUser,
        ...res.data.doctor,
        id: res.data.doctor.id,
        role: currentUser.role || "doctor",
      });
    } catch (error) {
      console.error("Failed to update doctor availability", error);
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const getPatientId = (patient) => {
    if (!patient) return null;

    return typeof patient === "string" ? patient : patient._id;
  };

  const openAppointmentChat = (appointment) => {
    const patientId = getPatientId(appointment.patient);

    if (!patientId) return;

    navigate(`/patients/${patientId}?chat=1&appointment=${appointment._id}`);
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
      (vital.bloodPressure ? parseInt(vital.bloodPressure.split("/")[0], 10) : 0);

    return {
      name: vital.patient?.name || "Patient",
      systolic,
      glucose: vital.glucoseLevel || vital.bloodSugar || 0,
    };
  });

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
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Link
            to="/patients"
            className={`relative p-6 transition hover:-translate-y-0.5 hover:shadow-md ${surfaceClass}`}
          >
            {totalUnreadConversations > 0 && (
              <span className="absolute right-5 top-5 min-w-7 rounded-full bg-red-500 px-2 py-1 text-center text-xs font-semibold text-white">
                {totalUnreadConversations}
              </span>
            )}
            <p className="text-sm font-medium text-slate-500">Patients</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {stats.patients}
            </p>
            <p className="mt-3 text-sm text-blue-600">Open patient records</p>
          </Link>

          <div className={`p-6 ${surfaceClass}`}>
            <p className="text-sm font-medium text-slate-500">
              Pending Appointments
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {stats.appointments}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Recent bookings and consultations waiting for follow-up.
            </p>
          </div>

          <div className={`p-6 ${surfaceClass}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Critical Alerts
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-red-500">
                  {stats.alerts}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAlertDetails((prev) => !prev)}
                className="rounded-full bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
              >
                {showAlertDetails ? "Close details" : "Open details"}
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Prioritize the latest critical submissions from patients.
            </p>
          </div>
        </section>

        <section
          className={`grid gap-6 ${
            showAlertDetails
              ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
              : "grid-cols-1"
          }`}
        >
          <div className={`p-6 ${surfaceClass}`}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Patients</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Quick access to active conversations and recent profiles.
                </p>
              </div>

              <Link to="/patients" className="text-sm font-medium text-blue-600">
                View all
              </Link>
            </div>

            {patients.length === 0 ? (
              <p className="text-sm text-slate-500">No patients found.</p>
            ) : (
              <div className="space-y-3">
                {patients.slice(0, 5).map((patient) => (
                  <Link
                    key={patient._id}
                    to={`/patients/${patient._id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {patient.name}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {patient.email}
                      </p>
                    </div>

                    {unreadCountsByPatient[patient._id] > 0 && (
                      <span className="min-w-7 rounded-full bg-red-500 px-2 py-1 text-center text-xs font-semibold text-white">
                        {unreadCountsByPatient[patient._id]}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {showAlertDetails && (
            <div id="critical-alerts" className={`p-6 ${surfaceClass}`}>
              <div className="mb-4">
                <h3 className="text-xl font-semibold">Critical Alerts</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Open an alert to jump straight into the patient conversation.
                </p>
              </div>

              {alerts.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No active critical alerts.
                </p>
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
                        className="block w-full rounded-2xl border border-red-100 bg-red-50 p-4 text-left transition hover:bg-red-100 disabled:opacity-60"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-red-700">
                              {patientName}
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              {getVitalSummary(alert)}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              {new Date(alert.createdAt).toLocaleString()}
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
                        className="rounded-2xl border border-red-100 bg-red-50 p-4"
                      >
                        <p className="font-semibold text-red-700">
                          {patientName}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {getVitalSummary(alert)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <section className={`p-6 ${surfaceClass}`}>
          <div className="mb-4">
            <h3 className="text-xl font-semibold">Recent Appointments</h3>
            <p className="mt-1 text-sm text-slate-500">
              Tap an appointment to open the patient chat with the appointment reason in context.
            </p>
          </div>

          {appointments.length === 0 ? (
            <p className="text-sm text-slate-500">
              No appointments scheduled yet.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {appointments.map((appointment) => (
                  <button
                    key={appointment._id}
                    type="button"
                    onClick={() => openAppointmentChat(appointment)}
                    className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {appointment.patient?.name || "Unknown"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {new Date(
                            appointment.appointmentDate,
                          ).toLocaleDateString()}
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
                      <th className="py-3 pr-4 font-medium">Date</th>
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
                          {new Date(
                            appointment.appointmentDate,
                          ).toLocaleDateString()}
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
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className={`p-6 ${surfaceClass}`}>
            <h3 className="text-xl font-semibold">Blood Pressure Trend</h3>
            <p className="mt-1 text-sm text-slate-500">
              Latest systolic readings from recent patient submissions.
            </p>

            <div className="mt-5 h-[280px] sm:h-[320px]">
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
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`p-6 ${surfaceClass}`}>
            <h3 className="text-xl font-semibold">Glucose Trend</h3>
            <p className="mt-1 text-sm text-slate-500">
              Glucose changes across the latest monitored patients.
            </p>

            <div className="mt-5 h-[280px] sm:h-[320px]">
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
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </DoctorShell>
  );
}

export default Dashboard;
