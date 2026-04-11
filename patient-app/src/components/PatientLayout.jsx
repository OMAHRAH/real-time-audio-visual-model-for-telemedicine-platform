import { Outlet } from "react-router-dom";
import PatientNavbar from "./PatientNavbar";

export default function PatientLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors">
      <PatientNavbar />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
