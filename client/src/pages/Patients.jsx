import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import DoctorShell from "../components/DoctorShell";
import useUnreadPatientMessages from "../hooks/useUnreadPatientMessages";

const surfaceClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";

function Patients() {
  const { unreadCountsByPatient } = useUnreadPatientMessages();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await API.get("/patients");
        setPatients(res.data.patients ?? []);
        setError("");
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            "Unable to load patients. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return (
    <DoctorShell
      title="Patients"
      subtitle="Review patient records, unread chats and the latest follow-up activity."
    >
      <div className={`p-5 sm:p-6 ${surfaceClass}`}>
        {loading && <p className="text-sm text-slate-500">Loading patients...</p>}

        {!loading && error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && patients.length === 0 && (
          <p className="text-sm text-slate-500">No patients found.</p>
        )}

        {!loading && !error && patients.length > 0 && (
          <>
            <div className="space-y-3 lg:hidden">
              {patients.map((patient) => (
                <Link
                  key={patient._id}
                  to={`/patients/${patient._id}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {patient.name}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {patient.email}
                      </p>
                    </div>

                    {unreadCountsByPatient[patient._id] > 0 ? (
                      <span className="min-w-7 rounded-full bg-red-500 px-2 py-1 text-center text-xs font-semibold text-white">
                        {unreadCountsByPatient[patient._id]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                        No unread
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      {patient.lastAppointment
                        ? `Last appointment: ${new Date(
                            patient.lastAppointment,
                          ).toLocaleDateString()}`
                        : "No appointment yet"}
                    </span>
                    <span className="font-medium text-blue-600">Open</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="py-3 pr-4 font-medium">Name</th>
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Unread Chat</th>
                    <th className="py-3 pr-4 font-medium">Last Appointment</th>
                    <th className="py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient._id} className="border-b border-slate-100">
                      <td className="py-4 pr-4 font-medium text-slate-900">
                        {patient.name}
                      </td>

                      <td className="py-4 pr-4 text-slate-600">{patient.email}</td>

                      <td className="py-4 pr-4">
                        {unreadCountsByPatient[patient._id] > 0 ? (
                          <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                            {unreadCountsByPatient[patient._id]}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="py-4 pr-4 text-slate-600">
                        {patient.lastAppointment
                          ? new Date(
                              patient.lastAppointment,
                            ).toLocaleDateString()
                          : "No appointment"}
                      </td>

                      <td className="py-4">
                        <Link
                          to={`/patients/${patient._id}`}
                          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DoctorShell>
  );
}

export default Patients;
