import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="w-64 bg-blue-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-10">Omar MedPlus</h1>

      <ul className="space-y-4">
        <li>
          <Link to="/" className="hover:text-gray-300 block">
            Dashboard
          </Link>
        </li>

        <li>
          <Link to="/vitals" className="hover:text-gray-300 block">
            Vitals
          </Link>
        </li>

        <li>
          <Link to="/appointments" className="hover:text-gray-300 block">
            Appointments
          </Link>
        </li>

        <li>
          <Link to="/patients" className="hover:text-gray-300 block">
            Patients
          </Link>
        </li>

        <li>
          <Link to="/settings" className="hover:text-gray-300 block">
            Settings
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
