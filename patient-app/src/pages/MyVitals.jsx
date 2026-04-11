import { useEffect, useState } from "react";
import API from "../api/api";
import { getPatientId } from "../auth";

export default function MyVitals() {
  const patientId = getPatientId();
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [glucose, setGlucose] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doctorsRes, vitalsRes] = await Promise.all([
          API.get("/doctors"),
          API.get(`/vitals/patient/${patientId}`),
        ]);

        const doctors = doctorsRes.data.doctors ?? [];
        const preferredDoctor =
          doctors.find((doctor) => doctor.isOnline) || doctors[0];

        setDoctors(doctors);
        setDoctorId(preferredDoctor?._id || "");
        setVitals(vitalsRes.data.vitals ?? []);
      } catch (error) {
        console.error("Failed to load vitals page", error);
      }
    };

    if (patientId) {
      fetchData();
    }
  }, [patientId]);

  const submitVitals = async (e) => {
    e.preventDefault();
    setFeedback("");

    try {
      const res = await API.post("/vitals", {
        doctorId,
        systolic,
        diastolic,
        glucoseLevel: glucose,
        type: "combined",
      });

      setVitals((prev) => [res.data.vital, ...prev]);
      setFeedback(
        res.data.vital?.flagged
          ? "Vitals submitted. A doctor has been alerted."
          : "Vitals submitted successfully.",
      );

      setSystolic("");
      setDiastolic("");
      setGlucose("");
    } catch (err) {
      console.error(err);
      setFeedback(
        err.response?.data?.message || "Error submitting vitals",
      );
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
      <form
        onSubmit={submitVitals}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:sticky xl:top-24"
      >
        <p className="text-sm uppercase tracking-[0.22em] text-blue-600">
          Monitoring
        </p>
        <h2 className="mb-2 mt-2 text-2xl font-semibold sm:text-3xl">
          Submit daily vitals
        </h2>
        <p className="mb-6 text-sm leading-6 text-slate-500 sm:text-base">
          Send your blood pressure and glucose reading to an online doctor.
        </p>

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Doctor
        </label>
        <select
          className="mb-4 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          required
        >
          {doctors.map((doctor) => (
            <option key={doctor._id} value={doctor._id}>
              {doctor.name} - {doctor.specialty} (
              {doctor.isOnline ? "Online" : "Offline"})
            </option>
          ))}
        </select>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="number"
            placeholder="Systolic (e.g. 120)"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            required
          />

          <input
            type="number"
            placeholder="Diastolic (e.g. 80)"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            required
          />
        </div>

        <input
          type="number"
          placeholder="Glucose Level"
          value={glucose}
          onChange={(e) => setGlucose(e.target.value)}
          className="mb-4 mt-3 w-full rounded-2xl border border-slate-200 p-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          required
        />

        <button className="w-full rounded-2xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700">
          Submit vitals
        </button>

        {feedback && (
          <p className="mt-4 text-sm leading-6 text-slate-600">{feedback}</p>
        )}
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-2 text-2xl font-semibold sm:text-[1.75rem]">
          Recent readings
        </h2>
        <p className="mb-6 text-sm leading-6 text-slate-500 sm:text-base">
          Track your submissions and flagged results.
        </p>

        {vitals.length === 0 ? (
          <p className="text-slate-500">No vitals submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {vitals.slice(0, 8).map((vital) => (
              <div
                key={vital._id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {new Date(vital.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    BP {vital.systolic}/{vital.diastolic} | Glucose{" "}
                    {vital.glucoseLevel}
                  </p>
                </div>

                <span
                  className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-medium ${
                    vital.flagged
                      ? "bg-red-50 text-red-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {vital.flagged ? "Doctor alerted" : "Normal"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
