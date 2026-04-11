import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/api";

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState(
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

  const submitAppointment = async (e) => {
    e.preventDefault();
    setFeedback("");

    try {
      await API.post("/appointments", {
        doctorId: selectedDoctorId,
        appointmentDate,
        reason,
      });

      setReason("");
      setAppointmentDate("");
      setFeedback("Appointment request sent successfully.");
    } catch (error) {
      setFeedback(
        error.response?.data?.message ||
          "Unable to book appointment right now.",
      );
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr] xl:items-start">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-blue-600">
              Appointments
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Find a doctor
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Search doctors and book with those currently online.
            </p>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                  disabled={!doctor.isOnline}
                  onClick={() => setSelectedDoctorId(doctor._id)}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {selectedDoctorId === doctor._id ? "Selected" : "Book"}
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
          Book appointment
        </h2>
        <p className="mb-6 mt-2 text-sm leading-6 text-slate-500 sm:text-base">
          Pick an online doctor and request a consultation time.
        </p>

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Doctor
        </label>
        <select
          className="mb-4 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
          required
        >
          <option value="">Select an online doctor</option>
          {doctors
            .filter((doctor) => doctor.isOnline)
            .map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.name} - {doctor.specialty}
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
          onChange={(e) => setAppointmentDate(e.target.value)}
          required
        />

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Reason
        </label>
        <textarea
          className="mb-4 min-h-32 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder="Tell the doctor what you need help with"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <button className="w-full rounded-2xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-700">
          Request appointment
        </button>

        {feedback && (
          <p className="mt-4 text-sm leading-6 text-slate-600">{feedback}</p>
        )}
      </form>
    </div>
  );
}
