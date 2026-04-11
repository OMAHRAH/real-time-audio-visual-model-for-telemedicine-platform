import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "../auth";
import useUnreadPatientMessages from "../hooks/useUnreadPatientMessages";

function CloseIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    description: "Overview, alerts and appointments",
  },
  {
    to: "/patients",
    label: "Patients",
    description: "Conversations and records",
    showUnreadBadge: true,
  },
];

function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const currentUser = getCurrentUser();
  const { totalUnreadConversations } = useUnreadPatientMessages();

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  const handleLogout = () => {
    logout();
    onClose();
    window.location.href = "/login";
  };

  return (
    <>
      <div
        aria-hidden={!mobileOpen}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/55 transition duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col overflow-hidden border-r border-slate-800 bg-slate-950 px-5 py-6 text-slate-100 shadow-2xl transition-transform duration-300 lg:z-40 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Doctor Workspace
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Omar MedPlus
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {currentUser?.name || "Doctor"} | {currentUser?.role || "doctor"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-800 p-2 text-slate-300 transition hover:border-slate-700 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between gap-4 rounded-2xl px-4 py-3 transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/35"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p
                      className={`mt-1 text-xs ${
                        isActive ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>

                  {item.showUnreadBadge && totalUnreadConversations > 0 && (
                    <span className="min-w-7 rounded-full bg-red-500 px-2 py-1 text-center text-xs font-semibold text-white">
                      {totalUnreadConversations}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-800 pt-5">
          <p className="text-xs text-slate-500">
            Built for fast triage, follow-up and remote care.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 inline-flex self-start rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
