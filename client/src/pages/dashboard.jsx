import { useEffect, useState } from "react";
import API from "../api/api";
import Sidebar from "../components/sidebar";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function Dashboard() {
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    alerts: 0,
  });

  const [appointments, setAppointments] = useState([]);
  const [vitals, setVitals] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await API.get("/dashboard");

        setStats({
          patients: res.data.totalPatients,
          appointments: res.data.pendingAppointments,
          alerts: res.data.flaggedVitals,
        });
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAppointments = async () => {
      try {
        const res = await API.get("/appointments");
        setAppointments(res.data.appointments || []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchVitals = async () => {
      try {
        const res = await API.get("/vitals/latest");
        setVitals(res.data.vitals);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAlerts = async () => {
      try {
        const res = await API.get("/vitals/alerts");

        setStats((prev) => ({
          ...prev,
          alerts: res.data.length,
        }));
      } catch (err) {
        console.error(err);
      }
    };

    fetchDashboard();
    fetchAppointments();
    fetchVitals();
    fetchAlerts();

    socket.on("criticalAlert", (data) => {
      console.log("Critical alert received:", data);

      setStats((prev) => ({
        ...prev,
        alerts: prev.alerts + 1,
      }));
    });
  }, []);

  const chartData = vitals.map((v) => {
    const systolic =
      v.systolic ||
      (v.bloodPressure ? parseInt(v.bloodPressure.split("/")[0]) : 0);

    return {
      name: v.patient?.name || "Patient",
      systolic,
      glucose: v.glucoseLevel || v.bloodSugar || 0,
    };
  });

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 p-10">
        <h2 className="text-3xl font-bold mb-6">Doctor's Dashboard</h2>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Patients</h3>
            <p className="text-3xl font-bold mt-2">{stats.patients}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Pending Appointments</h3>
            <p className="text-3xl font-bold mt-2">{stats.appointments}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Critical Alerts</h3>
            <p className="text-3xl font-bold mt-2 text-red-500">
              {stats.alerts}
            </p>
          </div>
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Appointments</h3>

          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Patient</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {appointments.map((appt) => (
                <tr key={appt._id} className="border-b">
                  <td className="py-3">{appt.patient?.name || "Unknown"}</td>

                  <td>{new Date(appt.appointmentDate).toLocaleDateString()}</td>

                  <td>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                      {appt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-xl shadow p-6 mt-10">
          <h3 className="text-xl font-semibold mb-4">Blood Pressure Trend</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="systolic"
                stroke="#2563eb"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mt-10">
          <h3 className="text-xl font-semibold mb-4">Glucose Trend</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="glucose"
                stroke="#dc2626"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
