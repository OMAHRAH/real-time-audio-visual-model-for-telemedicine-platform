import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/api";

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [preferredDoctorId, setPreferredDoctorId] = useState(
    searchParams.get("doctor") || "",
  );
  const [appointmentDate, setAppointmentDate] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await API.get("/doctors");
        setDoctors(res.data.doctors ?? []);
      } catch (error) {
        console.error("Failed to fetch doctors", error);
      }
    };

    fetchDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return doctors;
    }

    return doctors.filter((doctor) =>
      [doctor.name, doctor.email, doctor.specialty]
        .join(" ")
        .toLowerCase()
        .includes(searchValue),
    );
  }, [doctors, search]);

  const selectedPreferredDoctor =
    doctors.find((doctor) => doctor._id === preferredDoctorId) || null;

  const submitAppointment = async (event) => {
    event.preventDefault();
    setFeedback("");

    try {
      await API.post("/appointments", {
        doctorId: preferredDoctorId || undefined,
        appointmentDate,
        reason,
      });

      setReason("");
      setAppointmentDate("");
      setFeedback(
        selectedPreferredDoctor
          ? `Appointment request sent. Admin will route this case and note that you prefer ${selectedPreferredDoctor.name}.`
          : "Appointment request sent. Admin will route you to the best available doctor.",
      );
    } catch (error) {
      setFeedback(
        error.response?.data?.message ||
          "Unable to request appointment right now.",
      );
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr] xl:items-start">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-blue-600">
              Intake
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Search doctors
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Browse doctors who are currently online. Choosing one below sets a
              preference only; the admin team still controls final routing.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or specialty"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 lg:max-w-sm"
          />
        </div>

        <div className="space-y-3 sm:space-y-4">
          {filteredDoctors.map((doctor) => (
            <div
              key={doctor._id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <p className="font-medium">{doctor.name}</p>
                <p className="mt-1 text-sm text-slate-500">{doctor.specialty}</p>
                <p className="mt-1 text-xs text-slate-400">{doctor.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    doctor.isOnline
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {doctor.isOnline ? "Online" : "Offline"}
                </span>

                <button
                  type="button"
                  onClick={() => setPreferredDoctorId(doctor._id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    preferredDoctorId === doctor._id
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {preferredDoctorId === doctor._id
                    ? "Preferred doctor"
                    : "Set preference"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <form
        onSubmit={submitAppointment}
        className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:sticky xl:top-24"
      >
        <h2 className="text-2xl font-semibold sm:text-[1.75rem]">
          Request appointment
        </h2>
        <p className="mb-6 mt-2 text-sm leading-6 text-slate-500 sm:text-base">
          Submit your preferred date and reason. Admin will route the request to
          the right available doctor.
        </p>

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Preferred doctor
        </label>
        <select
          className="mb-4 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          value={preferredDoctorId}
          onChange={(event) => setPreferredDoctorId(event.target.value)}
        >
          <option value="">No preference</option>
          {doctors.map((doctor) => (
            <option key={doctor._id} value={doctor._id}>
              {doctor.name} - {doctor.specialty} (
              {doctor.isOnline ? "Online" : "Offline"})
            </option>
          ))}
        </select>

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Preferred date and time
        </label>
        <input
          type="datetime-local"
          className="mb-4 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          value={appointmentDate}
          onChange={(event) => setAppointmentDate(event.target.value)}
          required
        />

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Reason
        </label>
        <textarea
          className="mb-4 min-h-32 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder="Tell the care team what you need help with"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />

        <button className="w-full rounded-2xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-700">
          Send appointment request
        </button>

        {feedback && (
          <p className="mt-4 text-sm leading-6 text-slate-600">{feedback}</p>
        )}
      </form>
    </div>
  );
}
