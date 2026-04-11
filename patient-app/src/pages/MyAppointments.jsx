import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import AppointmentCard from "../components/AppointmentCard";

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await API.get("/appointments");
        setAppointments(res.data.appointments ?? []);
      } catch (error) {
        console.error("Failed to load appointments", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-blue-600">
            Visits
          </p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            My appointments
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            Track approved, pending, and completed visits.
          </p>
        </div>

        <Link
          to="/appointments/new"
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-center text-white transition hover:bg-blue-700"
        >
          Book a new appointment
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <p className="text-slate-500">
          No appointments yet. Book your first consultation.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {appointments.map((appointment) => (
            <AppointmentCard key={appointment._id} appointment={appointment} />
          ))}
        </div>
      )}
    </section>
  );
}
