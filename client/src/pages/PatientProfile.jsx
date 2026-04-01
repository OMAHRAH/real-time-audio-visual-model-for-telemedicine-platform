import { useParams } from "react-router-dom";
import Sidebar from "../components/sidebar";
import { useEffect, useState } from "react";
import API from "../api/api";
import { io } from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const socket = io("http://localhost:5000");

function PatientProfile() {
  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [expandedAppointment, setExpandedAppointment] = useState(null);

  const [showSaveToast, setShowSaveToast] = useState(false);

  const [savedNoteId] = useState(null);

  const [latestVital, setLatestVital] = useState(null);

  const [timeline, setTimeline] = useState([]);

  const [timelineLimit, setTimelineLimit] = useState(4);

  const getRiskLevel = () => {
    if (!latestVital) return "Unknown";

    if (
      latestVital.systolic > 160 ||
      latestVital.diastolic > 100 ||
      latestVital.glucoseLevel > 180
    ) {
      return "High";
    }

    if (
      latestVital.systolic > 140 ||
      latestVital.diastolic > 90 ||
      latestVital.glucoseLevel > 150
    ) {
      return "Monitor";
    }

    return "Stable";
  };

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const vitalsRes = await API.get(`/vitals/patient/${id}`);
        const apptRes = await API.get(`/appointments/patient/${id}`);
        const chatRes = await API.get(`/chat/${id}`);

        setVitals(vitalsRes.data.vitals || []);
        setAppointments(apptRes.data.appointments || []);
        setMessages(chatRes.data || []);

        const vitalEvents = vitalsRes.data.vitals.map((v) => ({
          type: "vital",
          date: v.createdAt,
          data: v,
        }));

        const appointmentEvents = apptRes.data.appointments.map((a) => ({
          type: "appointment",
          date: a.appointmentDate,
          data: a,
        }));

        const combined = [...vitalEvents, ...appointmentEvents];

        combined.sort((a, b) => new Date(b.date) - new Date(a.date));

        setTimeline(combined);

        if (vitalsRes.data.vitals?.length > 0) {
          setLatestVital(vitalsRes.data.vitals[0]);
        }

        if (vitalsRes.data.vitals?.length > 0) {
          setPatient(vitalsRes.data.vitals[0].patient);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchPatientData();

    socket.on("new-message", (msg) => {
      if (msg.patient === id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.disconnect();
  }, [id]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const res = await API.post("/chat/send", {
        patient: id,
        sender: "69a66f3c5045f6e26c627c88",
        receiver: id,
        message: newMessage,
        type: "text",
      });

      setMessages((prev) => [...prev, res.data.chat]);
      setNewMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  const saveNotes = async (appointmentId) => {
    const notes = document.getElementById(`notes-${appointmentId}`).value;

    try {
      await API.patch(`/appointments/${appointmentId}/notes`, {
        notes,
      });

      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === appointmentId ? { ...appt, doctorNotes: notes } : appt,
        ),
      );

      setShowSaveToast(true);

      setTimeout(() => {
        setShowSaveToast(false);
      }, 2000);

      setExpandedAppointment(null);
    } catch (err) {
      console.error(err);
    }
  };

  const completeAppointment = async (appointmentId) => {
    try {
      await API.patch(`/appointments/${appointmentId}/status`, {
        status: "completed",
      });

      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === appointmentId ? { ...appt, status: "completed" } : appt,
        ),
      );

      setExpandedAppointment(null);
    } catch (err) {
      console.error(err);
    }
  };

  const autoSaveNotes = async (appointmentId, notes) => {
    if (!notes) return;

    try {
      await API.patch(`/appointments/${appointmentId}/notes`, {
        notes,
      });

      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === appointmentId ? { ...appt, doctorNotes: notes } : appt,
        ),
      );

      setShowSaveToast(true);

      setTimeout(() => {
        setShowSaveToast(false);
      }, 2000);

      setExpandedAppointment(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {showSaveToast && (
        <div className="fixed top-6 right-6 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
          ✓ Notes saved
        </div>
      )}

      <Sidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Patient Profile</h1>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Patient Health Summary</h2>

          {latestVital ? (
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-gray-500 text-sm">Latest BP</p>
                <p className="text-lg font-semibold">
                  {latestVital.systolic}/{latestVital.diastolic}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-sm">Glucose</p>
                <p className="text-lg font-semibold">
                  {latestVital.glucoseLevel}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-sm">Risk Level</p>

                <p
                  className={
                    getRiskLevel() === "High"
                      ? "text-red-600 font-semibold"
                      : getRiskLevel() === "Monitor"
                        ? "text-yellow-600 font-semibold"
                        : "text-green-600 font-semibold"
                  }
                >
                  {getRiskLevel()}
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-sm">Last Reading</p>
                <p className="text-lg font-semibold">
                  {new Date(latestVital.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p>No vitals available</p>
          )}
        </div>

        {/* Patient Info */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Patient Information</h2>

          <p>Name: {patient?.name}</p>
          <p>Email: {patient?.email}</p>
        </div>

        {/* Vitals history */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Vitals History</h2>

          <p className="mb-4">Total Readings: {vitals.length}</p>

          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th>Date</th>
                <th>Blood Pressure</th>
                <th>Glucose</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {vitals.map((v) => (
                <tr key={v._id} className="border-b">
                  <td>{new Date(v.createdAt).toLocaleDateString()}</td>

                  <td>
                    {v.systolic}/{v.diastolic}
                  </td>

                  <td>{v.glucoseLevel}</td>

                  <td>
                    {v.flagged ? (
                      <span className="text-red-600 font-semibold">
                        Critical
                      </span>
                    ) : (
                      <span className="text-green-600">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* charts trend */}

        <h3 className="text-lg font-semibold mt-6 mb-10">Vitals Trend</h3>

        <div className="w-full h-[300px]">
          <ResponsiveContainer>
            <LineChart data={vitals}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="createdAt"
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />

              <YAxis />

              <Tooltip />

              <Line type="monotone" dataKey="systolic" stroke="#2563eb" />

              <Line type="monotone" dataKey="glucoseLevel" stroke="#dc2626" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6 transition-all duration-500 ease-in-out">
          <h2 className="text-xl font-semibold mb-4">Medical Timeline</h2>

          <div className="space-y-4">
            {timeline.slice(0, timelineLimit).map((event, index) => (
              <div
                key={index}
                className="border-l-4 border-blue-500 pl-4 py-2 opacity-0 animate-fadeIn"
              >
                <p className="text-sm text-gray-500">
                  {new Date(event.date).toLocaleString()}
                </p>

                {event.type === "vital" && (
                  <div>
                    <p className="font-semibold">Vital Reading</p>

                    <p>
                      BP: {event.data.systolic}/{event.data.diastolic}
                    </p>

                    <p>Glucose: {event.data.glucoseLevel}</p>

                    {event.data.flagged && (
                      <p className="text-red-600 font-semibold">
                        Critical Alert
                      </p>
                    )}
                  </div>
                )}

                {event.type === "appointment" && (
                  <div>
                    <p className="font-semibold">
                      Appointment ({event.data.status})
                    </p>

                    {event.data.doctorNotes && (
                      <p className="text-gray-700">
                        Notes: {event.data.doctorNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-4 flex items-center gap-2">
              <label className="text-sm text-gray-600">Show more:</label>

              <select
                className="border rounded px-2 py-1"
                onChange={(e) => setTimelineLimit(Number(e.target.value))}
                value={timelineLimit}
              >
                <option value={4}>Last 4</option>
                <option value={10}>Last 10</option>
                <option value={20}>Last 20</option>
                <option value={timeline.length}>All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Appointments</h2>

          {appointments.length === 0 ? (
            <p>No appointments found</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th>Date</th>
                  <th>Doctor</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {appointments.map((appt) => (
                  <>
                    <tr
                      key={appt._id}
                      className="border-b cursor-pointer hover:bg-gray-100"
                      onClick={() =>
                        setExpandedAppointment(
                          expandedAppointment === appt._id ? null : appt._id,
                        )
                      }
                    >
                      <td>
                        {new Date(appt.appointmentDate).toLocaleDateString()}
                      </td>

                      <td>{appt.doctor?.name}</td>

                      <td
                        className={
                          appt.status === "completed"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }
                      >
                        {appt.status}
                      </td>
                    </tr>

                    {expandedAppointment === appt._id && (
                      <tr>
                        <td colSpan="3" className="p-4 bg-gray-50">
                          <textarea
                            id={`notes-${appt._id}`}
                            defaultValue={appt.doctorNotes}
                            placeholder="Write visit notes..."
                            className="border p-2 w-full rounded"
                            onBlur={(e) =>
                              autoSaveNotes(appt._id, e.target.value)
                            }
                          />

                          {savedNoteId === appt._id && (
                            <p className="text-green-600 text-sm mt-2">
                              ✓ Notes saved
                            </p>
                          )}

                          <button
                            onClick={() => saveNotes(appt._id)}
                            className="bg-green-600 text-white px-3 py-1 rounded mt-2"
                          >
                            Save Notes
                          </button>
                          <button
                            onClick={() => completeAppointment(appt._id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded mt-2 ml-2"
                          >
                            Complete Visit
                          </button>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Chat */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Conversation</h2>

          <div className="h-60 overflow-y-auto border rounded p-4 mb-4">
            {messages.map((msg) => (
              <div key={msg._id} className="mb-2">
                <span className="font-semibold">
                  {msg.sender?.name || "Doctor"}:
                </span>

                <span className="ml-2">{msg.message}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
              placeholder="Type message..."
            />

            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientProfile;
