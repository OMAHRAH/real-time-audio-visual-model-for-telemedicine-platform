import { Fragment } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const sectionClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";

function PatientRecordPanel({
  patient,
  latestVital,
  getRiskLevel,
  vitals,
  timeline,
  timelineLimit,
  onTimelineLimitChange,
  appointments,
  expandedAppointment,
  onToggleAppointment,
  onSaveNotes,
  onCompleteAppointment,
  onAutoSaveNotes,
  savedNoteId,
  compact = false,
}) {
  const chartData = vitals.map((vital) => ({
    date: new Date(vital.createdAt).toLocaleDateString(),
    systolic: vital.systolic,
    glucoseLevel: vital.glucoseLevel,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className={`p-5 sm:p-6 ${sectionClass}`}>
        <h2 className="text-xl font-semibold">Patient Health Summary</h2>

        {latestVital ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Latest BP</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {latestVital.systolic}/{latestVital.diastolic}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Glucose</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {latestVital.glucoseLevel}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Risk Level</p>
              <p
                className={`mt-2 text-lg font-semibold ${
                  getRiskLevel() === "High"
                    ? "text-red-600"
                    : getRiskLevel() === "Monitor"
                      ? "text-yellow-600"
                      : "text-emerald-600"
                }`}
              >
                {getRiskLevel()}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Last Reading</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {new Date(latestVital.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No vitals available.</p>
        )}
      </section>

      <section className={`p-5 sm:p-6 ${sectionClass}`}>
        <h2 className="text-xl font-semibold">Patient Information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Name</p>
            <p className="mt-2 font-semibold text-slate-900">{patient?.name}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Email</p>
            <p className="mt-2 break-all font-semibold text-slate-900">
              {patient?.email}
            </p>
          </div>
        </div>
      </section>

      <section className={`p-5 sm:p-6 ${sectionClass}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Vitals Trend</h2>
            <p className="mt-1 text-sm text-slate-500">
              Systolic pressure and glucose over time.
            </p>
          </div>
        </div>

        {chartData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No chart data available yet.
          </p>
        ) : (
          <div className={`mt-4 ${compact ? "h-[220px]" : "h-[300px]"}`}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="systolic" stroke="#2563eb" />
                <Line
                  type="monotone"
                  dataKey="glucoseLevel"
                  stroke="#dc2626"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className={`p-5 sm:p-6 ${sectionClass}`}>
        <h2 className="text-xl font-semibold">Vitals History</h2>
        <p className="mt-1 text-sm text-slate-500">
          Total readings: {vitals.length}
        </p>

        {vitals.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No vitals available.</p>
        ) : compact ? (
          <div className="mt-4 space-y-3">
            {vitals.map((vital) => (
              <div
                key={vital._id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {new Date(vital.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      BP {vital.systolic}/{vital.diastolic}
                    </p>
                    <p className="text-sm text-slate-600">
                      Glucose {vital.glucoseLevel}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      vital.flagged
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {vital.flagged ? "Critical" : "Normal"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Blood Pressure</th>
                  <th className="py-3 pr-4 font-medium">Glucose</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {vitals.map((vital) => (
                  <tr key={vital._id} className="border-b border-slate-100">
                    <td className="py-4 pr-4 text-slate-900">
                      {new Date(vital.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 pr-4 text-slate-600">
                      {vital.systolic}/{vital.diastolic}
                    </td>

                    <td className="py-4 pr-4 text-slate-600">
                      {vital.glucoseLevel}
                    </td>

                    <td className="py-4">
                      <span
                        className={`text-sm font-medium ${
                          vital.flagged ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {vital.flagged ? "Critical" : "Normal"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`p-5 sm:p-6 ${sectionClass}`}>
        <h2 className="text-xl font-semibold">Medical Timeline</h2>

        <div className="mt-4 space-y-4">
          {timeline.slice(0, timelineLimit).map((event, index) => (
            <div
              key={`${event.type}-${event.date}-${index}`}
              className="border-l-4 border-blue-500 pl-4"
            >
              <p className="text-sm text-slate-500">
                {new Date(event.date).toLocaleString()}
              </p>

              {event.type === "vital" && (
                <div className="mt-2">
                  <p className="font-semibold text-slate-900">Vital Reading</p>
                  <p className="mt-1 text-sm text-slate-600">
                    BP: {event.data.systolic}/{event.data.diastolic}
                  </p>
                  <p className="text-sm text-slate-600">
                    Glucose: {event.data.glucoseLevel}
                  </p>
                  {event.data.flagged && (
                    <p className="mt-1 text-sm font-semibold text-red-600">
                      Critical Alert
                    </p>
                  )}
                </div>
              )}

              {event.type === "appointment" && (
                <div className="mt-2">
                  <p className="font-semibold text-slate-900">
                    Appointment ({event.data.status})
                  </p>
                  {event.data.doctorNotes && (
                    <p className="mt-1 text-sm text-slate-600">
                      Notes: {event.data.doctorNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Show more:</label>

            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              onChange={(event) =>
                onTimelineLimitChange(Number(event.target.value))
              }
              value={timelineLimit}
            >
              <option value={4}>Last 4</option>
              <option value={10}>Last 10</option>
              <option value={20}>Last 20</option>
              <option value={timeline.length}>All</option>
            </select>
          </div>
        </div>
      </section>

      <section className={`p-5 sm:p-6 ${sectionClass}`}>
        <h2 className="text-xl font-semibold">Appointments</h2>

        {appointments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No appointments found.</p>
        ) : compact ? (
          <div className="mt-4 space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment._id}
                className="rounded-2xl border border-slate-200"
              >
                <button
                  type="button"
                  onClick={() => onToggleAppointment(appointment._id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {new Date(
                        appointment.appointmentDate,
                      ).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {appointment.doctor?.name}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      appointment.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {appointment.status}
                  </span>
                </button>

                {expandedAppointment === appointment._id && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                    {appointment.reason && (
                      <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                        <p className="text-sm font-semibold text-blue-900">
                          Appointment reason
                        </p>
                        <p className="mt-1 text-sm text-blue-800">
                          {appointment.reason}
                        </p>
                      </div>
                    )}

                    <textarea
                      id={`notes-${appointment._id}`}
                      defaultValue={appointment.doctorNotes}
                      placeholder="Write visit notes..."
                      className="min-h-28 w-full rounded-2xl border border-slate-200 p-3"
                      onBlur={(event) =>
                        onAutoSaveNotes(appointment._id, event.target.value)
                      }
                    />

                    {savedNoteId === appointment._id && (
                      <p className="mt-2 text-sm text-emerald-600">
                        Notes saved
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onSaveNotes(appointment._id)}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                      >
                        Save Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => onCompleteAppointment(appointment._id)}
                        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                      >
                        Complete Visit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Doctor</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {appointments.map((appointment) => (
                  <Fragment key={appointment._id}>
                    <tr
                      className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                      onClick={() => onToggleAppointment(appointment._id)}
                    >
                      <td className="py-4 pr-4 text-slate-900">
                        {new Date(
                          appointment.appointmentDate,
                        ).toLocaleDateString()}
                      </td>

                      <td className="py-4 pr-4 text-slate-600">
                        {appointment.doctor?.name}
                      </td>

                      <td
                        className={`py-4 font-medium ${
                          appointment.status === "completed"
                            ? "text-emerald-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {appointment.status}
                      </td>
                    </tr>

                    {expandedAppointment === appointment._id && (
                      <tr>
                        <td colSpan="3" className="bg-slate-50 p-4">
                          {appointment.reason && (
                            <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                              <p className="text-sm font-semibold text-blue-900">
                                Appointment reason
                              </p>
                              <p className="mt-1 text-sm text-blue-800">
                                {appointment.reason}
                              </p>
                            </div>
                          )}

                          <textarea
                            id={`notes-${appointment._id}`}
                            defaultValue={appointment.doctorNotes}
                            placeholder="Write visit notes..."
                            className="min-h-28 w-full rounded-2xl border border-slate-200 p-3"
                            onBlur={(event) =>
                              onAutoSaveNotes(
                                appointment._id,
                                event.target.value,
                              )
                            }
                          />

                          {savedNoteId === appointment._id && (
                            <p className="mt-2 text-sm text-emerald-600">
                              Notes saved
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => onSaveNotes(appointment._id)}
                              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                            >
                              Save Notes
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onCompleteAppointment(appointment._id)
                              }
                              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                            >
                              Complete Visit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default PatientRecordPanel;
