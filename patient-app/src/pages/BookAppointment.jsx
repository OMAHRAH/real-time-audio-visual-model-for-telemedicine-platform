import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/api";

const getDoctorStatusBadgeClassName = (doctor) => {
  if (doctor.acceptingNewPatients) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (doctor.isOnline) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-500";
};

const formatSlotWindow = (slot) => {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const timeZone = slot.timezone || "Africa/Lagos";

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      primary: "Schedule pending",
      secondary: timeZone,
    };
  }

  return {
    primary: start.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }),
    secondary: `Ends ${end.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    })} | ${timeZone}`,
  };
};

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [preferredDoctorId, setPreferredDoctorId] = useState(
    searchParams.get("doctor") || "",
  );
  const [appointmentDate, setAppointmentDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
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
  const selectedSlot =
    availableSlots.find((slot) => slot._id === selectedSlotId) || null;

  useEffect(() => {
    const fetchSlots = async () => {
      if (!preferredDoctorId) {
        setAvailableSlots([]);
        setSelectedSlotId("");
        return;
      }

      setLoadingSlots(true);

      try {
        const res = await API.get(`/scheduling/doctors/${preferredDoctorId}/slots`);
        setAvailableSlots(res.data.slots ?? []);
      } catch (error) {
        console.error("Failed to fetch doctor slots", error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [preferredDoctorId]);

  const submitAppointment = async (event) => {
    event.preventDefault();
    setFeedback("");

    try {
      await API.post("/appointments", {
        doctorId: preferredDoctorId || undefined,
        appointmentDate: selectedSlot?.start || appointmentDate,
        appointmentTimezone:
          selectedSlot?.timezone ||
          selectedPreferredDoctor?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        slotId: selectedSlotId || undefined,
        reason,
      });

      setReason("");
      setAppointmentDate("");
      setSelectedSlotId("");
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
              Browse live doctor availability and workload state. Choosing one
              below sets a preference only; the admin team still controls final
              routing.
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
                <p className="mt-2 text-xs text-slate-500">
                  {doctor.acceptingNewPatients
                    ? "Accepting new patients now."
                    : doctor.isOnline
                      ? "Visible online, but currently carrying active workload."
                      : "Offline from the live queue."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${getDoctorStatusBadgeClassName(
                    doctor,
                  )}`}
                >
                  {doctor.workloadStatusLabel ||
                    (doctor.isOnline ? "Online" : "Offline")}
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
              {doctor.workloadStatusLabel ||
                (doctor.isOnline ? "Online" : "Offline")}
              )
            </option>
          ))}
        </select>

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Preferred date and time
        </label>
        {preferredDoctorId ? (
          <div className="mb-4 space-y-3">
            {loadingSlots ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Loading available slots...
              </p>
            ) : availableSlots.length === 0 ? (
              <>
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No published slots yet for this doctor. You can still request
                  a manual date below.
                </p>
                <input
                  type="datetime-local"
                  className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={appointmentDate}
                  onChange={(event) => setAppointmentDate(event.target.value)}
                  required={!selectedSlotId}
                />
              </>
            ) : (
              <div className="space-y-2">
                {availableSlots.slice(0, 8).map((slot) => {
                  const slotWindow = formatSlotWindow(slot);

                  return (
                  <button
                    key={slot._id}
                    type="button"
                    onClick={() => {
                      setSelectedSlotId(slot._id);
                      setAppointmentDate("");
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selectedSlotId === slot._id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="font-medium text-slate-900">
                      {slotWindow.primary}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {slotWindow.secondary}
                    </p>
                  </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedSlotId("")}
                  className="text-sm font-medium text-blue-600"
                >
                  Clear selected slot and request a manual time instead
                </button>
                {!selectedSlotId && (
                  <input
                    type="datetime-local"
                    className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    value={appointmentDate}
                    onChange={(event) => setAppointmentDate(event.target.value)}
                    required={!selectedSlotId}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <input
            type="datetime-local"
            className="mb-4 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            value={appointmentDate}
            onChange={(event) => setAppointmentDate(event.target.value)}
            required
          />
        )}

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
