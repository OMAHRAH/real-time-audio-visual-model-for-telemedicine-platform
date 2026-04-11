export default function AdminRoutingControls({
  doctors,
  selectedDoctorId,
  onDoctorChange,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Route patient",
}) {
  return (
    <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[22rem] lg:flex-row">
      <select
        value={selectedDoctorId}
        onChange={(event) => onDoctorChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">Select doctor</option>
        {doctors.map((doctor) => (
          <option key={doctor._id} value={doctor._id}>
            {doctor.name} - {doctor.specialty} {doctor.isOnline ? "(Online)" : "(Offline)"}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!selectedDoctorId || isSubmitting}
        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
