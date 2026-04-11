import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import { getPatientId, getStoredUser } from "../auth";
import AppointmentCard from "../components/AppointmentCard";
import VitalCard from "../components/VitalCard";
import useUnreadChats from "../hooks/useUnreadChats";

export default function PatientDashboard() {
  const user = getStoredUser();
  const patientId = getPatientId();
  const { totalUnreadConversations } = useUnreadChats();
  const [latestVital, setLatestVital] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [onlineDoctors, setOnlineDoctors] = useState([]);
  const [selectedEmergencyDoctor, setSelectedEmergencyDoctor] = useState("");
  const [loading, setLoading] = useState(true);
  const [emergencyState, setEmergencyState] = useState({
    loading: false,
    message: "",
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [vitalsRes, appointmentsRes, doctorsRes] = await Promise.all([
          API.get(`/vitals/patient/${patientId}`),
          API.get("/appointments"),
          API.get("/doctors?online=true"),
        ]);

        const doctors = doctorsRes.data.doctors ?? [];
        setLatestVital(vitalsRes.data.vitals?.[0] ?? null);
        setAppointments(appointmentsRes.data.appointments ?? []);
        setOnlineDoctors(doctors);
        setSelectedEmergencyDoctor(doctors[0]?._id || "");
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

  const sendEmergencyAlert = async () => {
    setEmergencyState({
      loading: true,
      message: "",
    });

    try {
      const res = await API.post("/alerts/emergency", {
        doctorId: selectedEmergencyDoctor || undefined,
      });

      setEmergencyState({
        loading: false,
        message: res.data.message || "Emergency alert sent",
      });
    } catch (error) {
      setEmergencyState({
        loading: false,
        message:
          error.response?.data?.message ||
          "Unable to send emergency alert right now.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-blue-600">
              Daily Care
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Welcome back, {user?.name || "Patient"}
            </h2>
            <p className="text-slate-500 mt-3 max-w-2xl">
              Book appointments, submit your daily vitals, reach online
              doctors, and trigger urgent support from one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:flex-wrap">
            <Link
              to="/appointments/new"
              className="rounded-full bg-blue-600 px-5 py-3 text-center text-white"
            >
              Book appointment
            </Link>
            <Link
              to="/vitals"
              className="rounded-full border border-slate-300 px-5 py-3 text-center"
            >
              Submit vitals
            </Link>
            <Link
              to="/chat"
              className="relative rounded-full border border-slate-300 px-5 py-3 text-center"
            >
              Open chat
              {totalUnreadConversations > 0 && (
                <span className="absolute -right-2 -top-2 min-w-7 rounded-full bg-red-500 px-2 py-1 text-center text-xs font-semibold text-white">
                  {totalUnreadConversations}
                </span>
              )}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Online doctors</p>
          <p className="text-3xl font-semibold mt-2">{onlineDoctors.length}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Upcoming appointments</p>
          <p className="text-3xl font-semibold mt-2">{appointments.length}</p>
        </div>

        <VitalCard
          title="Latest Blood Pressure"
          value={
            latestVital
              ? `${latestVital.systolic || "-"} / ${latestVital.diastolic || "-"}`
              : "No data"
          }
        />

        <VitalCard
          title="Latest Glucose"
          value={latestVital?.glucoseLevel || "No data"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold">Online doctors</h3>
            <Link to="/appointments/new" className="text-blue-600 text-sm">
              Search and book
            </Link>
          </div>

          {loading ? (
            <p className="text-slate-500">Loading doctors...</p>
          ) : onlineDoctors.length === 0 ? (
            <p className="text-slate-500">
              No doctors are currently online.
            </p>
          ) : (
            <div className="space-y-4">
              {onlineDoctors.slice(0, 3).map((doctor) => (
                <div
                  key={doctor._id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{doctor.name}</p>
                    <p className="text-sm text-slate-500">{doctor.specialty}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-medium">
                      Online
                    </span>
                    <Link
                      to={`/appointments/new?doctor=${doctor._id}`}
                      className="text-sm font-medium text-blue-600"
                    >
                      Book now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 sm:p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-red-600">
            Emergency
          </p>
          <h3 className="text-2xl font-semibold mt-2 text-slate-900">
            Need urgent help?
          </h3>
          <p className="text-slate-600 mt-3">
            Send an emergency alert to an available doctor immediately.
          </p>

          <select
            className="w-full mt-5 border border-red-200 rounded-2xl p-3 bg-white"
            value={selectedEmergencyDoctor}
            onChange={(e) => setSelectedEmergencyDoctor(e.target.value)}
          >
            {onlineDoctors.length === 0 && (
              <option value="">Auto-assign available doctor</option>
            )}

            {onlineDoctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.name} - {doctor.specialty}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={sendEmergencyAlert}
            disabled={emergencyState.loading}
            className="mt-4 w-full rounded-2xl bg-red-600 p-3 text-white disabled:bg-red-300"
          >
            {emergencyState.loading ? "Sending emergency alert..." : "Push emergency button"}
          </button>

          {emergencyState.message && (
            <p className="text-sm mt-3 text-slate-700">
              {emergencyState.message}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold">Recent appointments</h3>
          <Link to="/appointments" className="text-blue-600 text-sm">
            View all
          </Link>
        </div>

        {appointments.length === 0 ? (
          <p className="text-slate-500">
            No appointments yet. Book your first consultation.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {appointments.slice(0, 4).map((appointment) => (
              <AppointmentCard key={appointment._id} appointment={appointment} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
