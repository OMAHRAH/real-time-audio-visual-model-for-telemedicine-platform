import { useEffect, useState } from "react";
import VitalCard from "../components/VitalCard";
import AppointmentCard from "../components/AppointmentCard";
import API from "../api/api";

export default function PatientDashboard() {

  const [vitals, setVitals] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {

    const patientId = localStorage.getItem("patientId");
  
    if (!patientId) {
      console.error("No patientId found");
      return;
    }
  
    const vitalsRes = await API.get(`/vitals/patient/${patientId}`);
  
    const latestVital = vitalsRes.data.vitals[0];
  
    setVitals(latestVital);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start pt-10">
  
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6">
  
        <h1 className="text-2xl font-semibold mb-6">
          Welcome Back
        </h1>

        <a
  href="/vitals"
  className="inline-block bg-blue-600 text-white px-4 py-2 rounded mb-6"
>
  Submit New Vitals
</a>
        {vitals ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <VitalCard
              title="Blood Pressure"
              value={`${vitals.systolic}/${vitals.diastolic}`}
            />
  
            <VitalCard
              title="Glucose"
              value={vitals.glucoseLevel}
            />
          </div>
        ) : (
          <p className="text-gray-500 mb-6">No vitals available</p>
        )}
  
        <h2 className="text-lg font-semibold mb-3">
          Upcoming Appointments
        </h2>
  
        {appointments.length > 0 ? (
          appointments.slice(0,2).map(appt => (
            <AppointmentCard
              key={appt._id}
              appointment={appt}
            />
          ))
        ) : (
          <p className="text-gray-500">No upcoming appointments</p>
        )}
  
      </div>

      
  
    </div>

    
  );
}