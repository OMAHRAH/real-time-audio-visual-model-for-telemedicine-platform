function AppointmentsTable({ appointments }) {
  return (
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
  );
}

export default AppointmentsTable;
