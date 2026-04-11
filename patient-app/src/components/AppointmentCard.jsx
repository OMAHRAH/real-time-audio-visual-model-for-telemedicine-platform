export default function AppointmentCard({ appointment }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">
            {new Date(appointment.appointmentDate).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Doctor: {appointment.doctor?.name || "Not assigned"}
          </p>
        </div>

        <span className="inline-flex self-start rounded-full bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-blue-700">
          {appointment.status}
        </span>
      </div>

      {appointment.reason && (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {appointment.reason}
        </p>
      )}

      {appointment.doctorNotes && (
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Notes: {appointment.doctorNotes}
        </p>
      )}
    </div>
  );
}
