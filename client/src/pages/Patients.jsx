import Sidebar from "../components/sidebar";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";

function Patients() {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await API.get("/appointments");

        const patientMap = {};

        res.data.appointments.forEach((appt) => {
          const p = appt.patient;

          if (!patientMap[p._id]) {
            patientMap[p._id] = {
              ...p,
              lastAppointment: appt.appointmentDate,
            };
          } else {
            const existingDate = patientMap[p._id].lastAppointment;

            if (new Date(appt.appointmentDate) > new Date(existingDate)) {
              patientMap[p._id].lastAppointment = appt.appointmentDate;
            }
          }
        });

        setPatients(Object.values(patientMap));

        setPatients(uniquePatients);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPatients();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar />

      <div className="flex-1 p-10">
        <h2 className="text-3xl font-bold mb-6">Patients</h2>

        <div className="bg-white rounded-xl shadow p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Last Appointment</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {patients.map((patient) => (
                <tr key={patient._id} className="border-b">
                  <td className="py-3">{patient.name}</td>

                  <td>{patient.email}</td>

                  <td>
                    {patient.lastAppointment
                      ? new Date(patient.lastAppointment).toLocaleDateString()
                      : "No appointment"}
                  </td>

                  <td>
                    <Link
                      to={`/patients/${patient._id}`}
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Patients;
