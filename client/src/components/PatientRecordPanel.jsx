import { Fragment, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const sectionClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";

const buildInitialDraft = (appointment) => ({
  diagnosis: appointment?.diagnosis || "",
  prescription: appointment?.prescription || "",
  followUpPlan: appointment?.followUpPlan || "",
  visitSummary: appointment?.visitSummary || appointment?.doctorNotes || "",
});

const hasConsultationContent = (appointment) =>
  Boolean(
    appointment?.diagnosis ||
      appointment?.prescription ||
      appointment?.followUpPlan ||
      appointment?.visitSummary ||
      appointment?.doctorNotes,
  );

const getAppointmentDoctorLabel = (appointment) =>
  appointment.doctor?.name ||
  appointment.preferredDoctor?.name ||
  "Awaiting admin routing";

const getAgeLabel = (dateOfBirth) => {
  if (!dateOfBirth) {
    return "Not provided";
  }

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return "Not provided";
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? `${age} years` : "Not provided";
};

const getBmiLabel = (heightCm, weightKg) => {
  if (!heightCm || !weightKg) {
    return "Not available";
  }

  const heightMeters = Number(heightCm) / 100;
  if (!Number.isFinite(heightMeters) || heightMeters <= 0) {
    return "Not available";
  }

  const bmi = Number(weightKg) / (heightMeters * heightMeters);
  return Number.isFinite(bmi) ? bmi.toFixed(1) : "Not available";
};

function ConsultationRecordFields({
  appointment,
  readOnly,
  draft,
  onChange,
  onSave,
  onComplete,
  savedRecordId,
}) {
  if (readOnly) {
    if (!hasConsultationContent(appointment)) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          No consultation record has been added yet.
        </div>
      );
    }

    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {appointment.diagnosis ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Diagnosis
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {appointment.diagnosis}
            </p>
          </div>
        ) : null}

        {appointment.prescription ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Prescription
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {appointment.prescription}
            </p>
          </div>
        ) : null}

        {appointment.followUpPlan ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Follow-up plan
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {appointment.followUpPlan}
            </p>
          </div>
        ) : null}

        {(appointment.visitSummary || appointment.doctorNotes) ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Visit summary
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {appointment.visitSummary || appointment.doctorNotes}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Diagnosis
          </label>
          <textarea
            value={draft.diagnosis}
            onChange={(event) => onChange("diagnosis", event.target.value)}
            placeholder="Clinical impression and diagnosis"
            className="min-h-24 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Prescription
          </label>
          <textarea
            value={draft.prescription}
            onChange={(event) => onChange("prescription", event.target.value)}
            placeholder="Medication, dosage, and instructions"
            className="min-h-24 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Follow-up plan
          </label>
          <textarea
            value={draft.followUpPlan}
            onChange={(event) => onChange("followUpPlan", event.target.value)}
            placeholder="Tests, review date, or next step"
            className="min-h-24 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Visit summary
          </label>
          <textarea
            value={draft.visitSummary}
            onChange={(event) => onChange("visitSummary", event.target.value)}
            placeholder="Summarize the consultation in patient-ready language"
            className="min-h-24 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {savedRecordId === appointment._id ? (
        <p className="mt-3 text-sm font-medium text-emerald-600">
          Consultation record saved
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSave(appointment._id)}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Save record
        </button>
        <button
          type="button"
          onClick={() => onComplete(appointment._id)}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Complete visit
        </button>
      </div>
    </>
  );
}

function AppointmentDetails({
  appointment,
  readOnly,
  draft,
  onDraftChange,
  onSaveConsultationRecord,
  onCompleteAppointment,
  savedRecordId,
}) {
  return (
    <div className="space-y-3">
      {appointment.reason ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-sm font-semibold text-blue-900">
            Appointment reason
          </p>
          <p className="mt-1 text-sm text-blue-800">{appointment.reason}</p>
        </div>
      ) : null}

      <ConsultationRecordFields
        appointment={appointment}
        readOnly={readOnly}
        draft={draft}
        onChange={onDraftChange}
        onSave={onSaveConsultationRecord}
        onComplete={onCompleteAppointment}
        savedRecordId={savedRecordId}
      />
    </div>
  );
}

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
  onSaveConsultationRecord,
  onCompleteAppointment,
  savedRecordId,
  compact = false,
  readOnly = false,
}) {
  const chartData = vitals.map((vital) => ({
    date: new Date(vital.createdAt).toLocaleDateString(),
    systolic: vital.systolic,
    glucoseLevel: vital.glucoseLevel,
  }));
  const [draftsByAppointment, setDraftsByAppointment] = useState({});

  const getAppointmentDraft = useMemo(
    () => (appointment) =>
      draftsByAppointment[appointment._id] || buildInitialDraft(appointment),
    [draftsByAppointment],
  );

  const updateAppointmentDraft = (appointmentId, field, value) => {
    setDraftsByAppointment((prev) => ({
      ...prev,
      [appointmentId]: {
        ...(prev[appointmentId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveConsultationRecord = (appointmentId) => {
    const appointment = appointments.find((item) => item._id === appointmentId);

    if (!appointment) {
      return;
    }

    onSaveConsultationRecord(appointmentId, getAppointmentDraft(appointment), {
      markCompleted: false,
    });
  };

  const handleCompleteAppointment = (appointmentId) => {
    const appointment = appointments.find((item) => item._id === appointmentId);

    if (!appointment) {
      return;
    }

    onCompleteAppointment(appointmentId, getAppointmentDraft(appointment));
  };

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
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Name</p>
            <p className="mt-2 font-semibold text-slate-900">{patient?.name}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Hospital Number</p>
            <p className="mt-2 break-all font-semibold text-slate-900">
              {patient?.hospitalNumber || "Not assigned"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Timezone</p>
            <p className="mt-2 font-semibold text-slate-900">
              {patient?.timezone || "Africa/Lagos"}
            </p>
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
        <h2 className="text-xl font-semibold">Medical Profile</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Age</p>
            <p className="mt-2 font-semibold text-slate-900">
              {getAgeLabel(patient?.medicalProfile?.dateOfBirth)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Gender</p>
            <p className="mt-2 font-semibold capitalize text-slate-900">
              {patient?.medicalProfile?.gender?.replaceAll("_", " ") ||
                "Not provided"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Blood group</p>
            <p className="mt-2 font-semibold text-slate-900">
              {patient?.medicalProfile?.bloodGroup || "Not provided"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Height</p>
            <p className="mt-2 font-semibold text-slate-900">
              {patient?.medicalProfile?.heightCm
                ? `${patient.medicalProfile.heightCm} cm`
                : "Not provided"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Weight</p>
            <p className="mt-2 font-semibold text-slate-900">
              {patient?.medicalProfile?.weightKg
                ? `${patient.medicalProfile.weightKg} kg`
                : "Not provided"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">BMI</p>
            <p className="mt-2 font-semibold text-slate-900">
              {getBmiLabel(
                patient?.medicalProfile?.heightCm,
                patient?.medicalProfile?.weightKg,
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Emergency contact</p>
          {patient?.medicalProfile?.emergencyContact?.name ||
          patient?.medicalProfile?.emergencyContact?.phone ||
          patient?.medicalProfile?.emergencyContact?.relationship ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Name
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {patient.medicalProfile.emergencyContact.name || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Phone
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {patient.medicalProfile.emergencyContact.phone || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Relationship
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {patient.medicalProfile.emergencyContact.relationship ||
                    "Not provided"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              No emergency contact has been added yet.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {[
            ["Allergies", patient?.medicalProfile?.allergies],
            ["Current medications", patient?.medicalProfile?.medications],
            ["Medical history", patient?.medicalProfile?.medicalHistory],
            ["Ongoing conditions", patient?.medicalProfile?.ongoingConditions],
          ].map(([label, items]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{label}</p>
              {Array.isArray(items) && items.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {items.map((item) => (
                    <span
                      key={`${label}-${item}`}
                      className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No details added yet.</p>
              )}
            </div>
          ))}
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
                  {event.data.flagged ? (
                    <p className="mt-1 text-sm font-semibold text-red-600">
                      Critical Alert
                    </p>
                  ) : null}
                </div>
              )}

              {event.type === "appointment" && (
                <div className="mt-2">
                  <p className="font-semibold text-slate-900">
                    Appointment ({event.data.status})
                  </p>
                  {event.data.visitSummary || event.data.doctorNotes ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Summary:{" "}
                      {event.data.visitSummary || event.data.doctorNotes}
                    </p>
                  ) : null}
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
                      {getAppointmentDoctorLabel(appointment)}
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

                {expandedAppointment === appointment._id ? (
                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                    <AppointmentDetails
                      appointment={appointment}
                      readOnly={readOnly}
                      draft={getAppointmentDraft(appointment)}
                      onDraftChange={(field, value) =>
                        updateAppointmentDraft(appointment._id, field, value)
                      }
                      onSaveConsultationRecord={handleSaveConsultationRecord}
                      onCompleteAppointment={handleCompleteAppointment}
                      savedRecordId={savedRecordId}
                    />
                  </div>
                ) : null}
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
                        {getAppointmentDoctorLabel(appointment)}
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

                    {expandedAppointment === appointment._id ? (
                      <tr>
                        <td colSpan="3" className="bg-slate-50 p-4">
                          <AppointmentDetails
                            appointment={appointment}
                            readOnly={readOnly}
                            draft={getAppointmentDraft(appointment)}
                            onDraftChange={(field, value) =>
                              updateAppointmentDraft(
                                appointment._id,
                                field,
                                value,
                              )
                            }
                            onSaveConsultationRecord={
                              handleSaveConsultationRecord
                            }
                            onCompleteAppointment={handleCompleteAppointment}
                            savedRecordId={savedRecordId}
                          />
                        </td>
                      </tr>
                    ) : null}
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
