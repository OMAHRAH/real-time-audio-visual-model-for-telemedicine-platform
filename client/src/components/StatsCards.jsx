function StatsCards({ stats }) {
  return (
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
        <p className="text-3xl font-bold mt-2 text-red-500">{stats.alerts}</p>
      </div>
    </div>
  );
}

export default StatsCards;
