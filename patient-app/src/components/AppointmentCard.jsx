export default function AppointmentCard({ appointment }) {
    return (
      <div className="bg-white shadow rounded-xl p-4 mb-3">
        <p className="font-medium">
          {new Date(appointment.appointmentDate).toLocaleString()}
        </p>
  
        <p className="text-sm text-gray-500">
          Status: {appointment.status}
        </p>
      </div>
    );
  }