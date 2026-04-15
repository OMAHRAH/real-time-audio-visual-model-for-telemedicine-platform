import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import AppointmentCard from "../components/AppointmentCard";

const isReschedulable = (appointment) =>
  appointment.status !== "completed" &&
  new Date(appointment.appointmentDate).getTime() > Date.now();

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

const buildAppointmentDayLabel = (appointment) => {
  const parsed = new Date(appointment.appointmentDate);
  const timeZone = appointment.appointmentTimezone || "Africa/Lagos";

  if (Number.isNaN(parsed.getTime())) {
    return "Schedule pending";
  }

  return parsed.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  });
};

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAppointmentId, setExpandedAppointmentId] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [workingAppointmentId, setWorkingAppointmentId] = useState("");
  const [feedback, setFeedback] = useState("");

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

  const loadSlotsForAppointment = async (appointment) => {
    const doctorId = appointment.doctor?._id || appointment.preferredDoctor?._id;

    if (!doctorId) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);

    try {
      const res = await API.get(`/scheduling/doctors/${doctorId}/slots`);
      setAvailableSlots(res.data.slots ?? []);
    } catch (error) {
      console.error("Failed to fetch reschedule slots", error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const openReschedule = async (appointment) => {
    const nextId = expandedAppointmentId === appointment._id ? "" : appointment._id;
    setExpandedAppointmentId(nextId);
    setSelectedSlotId("");
    setManualDate("");
    setRescheduleReason("");
    setFeedback("");

    if (nextId) {
      await loadSlotsForAppointment(appointment);
    }
  };

  const submitReschedule = async (appointment) => {
    setWorkingAppointmentId(appointment._id);
    setFeedback("");

    try {
      const res = await API.patch(
        `/scheduling/appointments/${appointment._id}/reschedule`,
        {
          slotId: selectedSlotId || undefined,
          appointmentDate: selectedSlotId ? undefined : manualDate,
          appointmentTimezone: appointment.appointmentTimezone,
          rescheduleReason,
        },
      );

      setAppointments((prev) =>
        prev.map((item) =>
          item._id === appointment._id ? res.data.appointment : item,
        ),
      );
      setExpandedAppointmentId("");
      setAvailableSlots([]);
      setFeedback("Appointment rescheduled.");
    } catch (error) {
      console.error("Failed to reschedule appointment", error);
      setFeedback(
        error.response?.data?.message ||
          "Unable to reschedule the appointment right now.",
      );
    } finally {
      setWorkingAppointmentId("");
    }
  };

  const groupedAppointments = [...appointments]
    .sort(
      (left, right) =>
        new Date(left.appointmentDate).getTime() -
        new Date(right.appointmentDate).getTime(),
    )
    .reduce((groups, appointment) => {
      const dayLabel = buildAppointmentDayLabel(appointment);

      if (!groups[dayLabel]) {
        groups[dayLabel] = [];
      }

      groups[dayLabel].push(appointment);
      return groups;
    }, {});

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
            Track approved, pending, completed, and rescheduled visits.
          </p>
        </div>

        <Link
          to="/appointments/new"
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-center text-white transition hover:bg-blue-700"
        >
          Book a new appointment
        </Link>
      </div>

      {feedback ? (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {feedback}
        </div>
      ) : null}

      {loading ? (
        <p className="text-slate-500">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <p className="text-slate-500">
          No appointments yet. Book your first consultation.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedAppointments).map(([dayLabel, dayAppointments]) => (
            <div key={dayLabel} className="space-y-4">
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {dayLabel}
                </p>
              </div>

              {dayAppointments.map((appointment) => (
                <div key={appointment._id} className="rounded-3xl border border-slate-200 p-4">
                  <AppointmentCard appointment={appointment} />

                  {isReschedulable(appointment) ? (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <button
                        type="button"
                        onClick={() => openReschedule(appointment)}
                        className="text-sm font-medium text-blue-600"
                      >
                        {expandedAppointmentId === appointment._id
                          ? "Close reschedule"
                          : "Reschedule appointment"}
                      </button>

                      {expandedAppointmentId === appointment._id ? (
                        <div className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4">
                          {loadingSlots ? (
                            <p className="text-sm text-slate-500">Loading slots...</p>
                          ) : availableSlots.length > 0 ? (
                            <div className="space-y-2">
                              {availableSlots.slice(0, 6).map((slot) => {
                                const slotWindow = formatSlotWindow(slot);

                                return (
                                  <button
                                    key={slot._id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSlotId(slot._id);
                                      setManualDate("");
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
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              No open slots published yet for this doctor.
                            </p>
                          )}

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Or request a manual time
                            </label>
                            <input
                              type="datetime-local"
                              value={manualDate}
                              onChange={(event) => {
                                setManualDate(event.target.value);
                                setSelectedSlotId("");
                              }}
                              className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                              Reason for reschedule
                            </label>
                            <textarea
                              value={rescheduleReason}
                              onChange={(event) =>
                                setRescheduleReason(event.target.value)
                              }
                              className="min-h-24 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                              placeholder="Tell the care team why this appointment needs to move"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={
                              workingAppointmentId === appointment._id ||
                              (!selectedSlotId && !manualDate)
                            }
                            onClick={() => submitReschedule(appointment)}
                            className="w-full rounded-2xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                          >
                            {workingAppointmentId === appointment._id
                              ? "Rescheduling..."
                              : "Confirm reschedule"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
