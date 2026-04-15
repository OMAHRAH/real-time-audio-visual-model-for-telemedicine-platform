export default function AppointmentCard({ appointment }) {
  const doctorLabel = appointment.doctor?.name
    ? `Doctor: ${appointment.doctor.name}`
    : appointment.preferredDoctor?.name
      ? `Preferred doctor: ${appointment.preferredDoctor.name} (awaiting routing)`
      : "Doctor assignment pending admin routing";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">
            {new Date(appointment.appointmentDate).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {doctorLabel}
          </p>
          {appointment.appointmentTimezone && (
            <p className="mt-1 text-xs text-slate-400">
              Timezone: {appointment.appointmentTimezone}
            </p>
          )}
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

      {appointment.rescheduledAt && (
        <p className="mt-3 text-xs text-blue-600">
          Rescheduled on {new Date(appointment.rescheduledAt).toLocaleString()}
        </p>
      )}

      {appointment.doctorNotes && (
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Notes: {appointment.doctorNotes}
        </p>
      )}

      {(appointment.diagnosis ||
        appointment.prescription ||
        appointment.followUpPlan ||
        appointment.visitSummary) && (
        <div className="mt-4 grid gap-3">
          {appointment.diagnosis && (
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Diagnosis
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {appointment.diagnosis}
              </p>
            </div>
          )}

          {appointment.prescription && (
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Prescription
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {appointment.prescription}
              </p>
            </div>
          )}

          {appointment.followUpPlan && (
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Follow-up plan
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {appointment.followUpPlan}
              </p>
            </div>
          )}

          {appointment.visitSummary && (
            <div className="rounded-2xl bg-blue-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Visit summary
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-900">
                {appointment.visitSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
