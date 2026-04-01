export default function PatientNavbar() {
    return (
      <div className="bg-blue-600 text-white p-4 flex justify-between">
        <h1 className="font-semibold text-lg">TeleHealth</h1>
  
        <div className="flex gap-4 text-sm">
          <span>Dashboard</span>
          <span>Vitals</span>
          <span>Appointments</span>
          <span>Profile</span>
        </div>
      </div>
    );
  }