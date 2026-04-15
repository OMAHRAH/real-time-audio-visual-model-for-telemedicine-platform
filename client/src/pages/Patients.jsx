import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import { getCurrentUser } from "../auth";
import DoctorShell from "../components/DoctorShell";
import useUnreadPatientMessages from "../hooks/useUnreadPatientMessages";

const surfaceClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";

function Patients() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const { unreadCountsByPatient } = useUnreadPatientMessages();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  const getPatientPath = (patientId) =>
    isAdmin ? `/admin/patients/${patientId}` : `/patients/${patientId}`;

  const filteredPatients = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return patients;
    }

    return patients.filter((patient) =>
      [patient.name, patient.hospitalNumber, patient.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue),
    );
  }, [patients, search]);

  return (
    <DoctorShell
      title="Patients"
      subtitle={
        isAdmin
          ? "Review assignment status, patient records and routing readiness."
          : "Review patient records, unread chats and the latest follow-up activity."
      }
    >
      <div className={`p-5 sm:p-6 ${surfaceClass}`}>
        <div className="mb-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by patient name or hospital number"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 lg:max-w-md"
          />
        </div>

        {loading && <p className="text-sm text-slate-500">Loading patients...</p>}

        {!loading && error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && filteredPatients.length === 0 && (
          <p className="text-sm text-slate-500">No patients found.</p>
        )}

        {!loading && !error && filteredPatients.length > 0 && (
          <>
            <div className="space-y-3 lg:hidden">
              {filteredPatients.map((patient) => (
                <Link
                  key={patient._id}
                  to={getPatientPath(patient._id)}
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {patient.name}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {patient.hospitalNumber || "Hospital number not assigned"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
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
                      {isAdmin
                        ? patient.activeAssignment?.doctor?.name
                          ? `Assigned: ${patient.activeAssignment.doctor.name}`
                          : "Awaiting assignment"
                        : patient.lastAppointment
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
                    <th className="py-3 pr-4 font-medium">Hospital Number</th>
                    <th className="py-3 pr-4 font-medium">
                      {isAdmin ? "Assigned Doctor" : "Unread Chat"}
                    </th>
                    <th className="py-3 pr-4 font-medium">
                      {isAdmin ? "Routing Updated" : "Last Appointment"}
                    </th>
                    <th className="py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient._id} className="border-b border-slate-100">
                      <td className="py-4 pr-4 font-medium text-slate-900">
                        <div>
                          <p>{patient.name}</p>
                          <p className="mt-1 text-xs font-normal text-slate-400">
                            {patient.email}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 pr-4 text-slate-600">
                        {patient.hospitalNumber || "Not assigned"}
                      </td>

                      <td className="py-4 pr-4">
                        {isAdmin ? (
                          <span className="text-slate-600">
                            {patient.activeAssignment?.doctor?.name || "Awaiting assignment"}
                          </span>
                        ) : (
                          unreadCountsByPatient[patient._id] > 0 ? (
                            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                              {unreadCountsByPatient[patient._id]}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )
                        )}
                      </td>

                      <td className="py-4 pr-4 text-slate-600">
                        {isAdmin
                          ? patient.activeAssignment?.updatedAt
                            ? new Date(
                                patient.activeAssignment.updatedAt,
                              ).toLocaleDateString()
                            : "Not routed"
                          : patient.lastAppointment
                            ? new Date(
                                patient.lastAppointment,
                              ).toLocaleDateString()
                            : "No appointment"}
                      </td>

                      <td className="py-4">
                        <Link
                          to={getPatientPath(patient._id)}
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
