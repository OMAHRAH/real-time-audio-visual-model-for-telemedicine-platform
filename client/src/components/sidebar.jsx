import { NavLink } from "react-router-dom";
import { getCurrentUser, logout } from "../auth";
import useNotificationSummary from "../hooks/useNotificationSummary";
import useUnreadPatientMessages from "../hooks/useUnreadPatientMessages";
import useTheme from "../hooks/useTheme";

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

function MoonIcon({ className = "h-5 w-5" }) {
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3c0 0 0 0 0 0A7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function SunIcon({ className = "h-5 w-5" }) {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const currentUser = getCurrentUser();
  const { totalUnreadConversations } = useUnreadPatientMessages();
  const { unreadCount } = useNotificationSummary();
  const { isDark, toggleTheme } = useTheme();
  const isAdmin = currentUser?.role === "admin";
  const navItems = isAdmin
    ? [
        {
          to: "/",
          label: "Dashboard",
          description: "Routing, staffing and intake control",
        },
        {
          to: "/notifications",
          label: "Notifications",
          description: "Routing, triage and care updates",
          showNotificationBadge: true,
        },
        {
          to: "/patients",
          label: "Patients",
          description: "All patient records and assignments",
        },
      ]
    : [
        {
          to: "/",
          label: "Dashboard",
          description: "Overview, alerts and appointments",
        },
        {
          to: "/notifications",
          label: "Notifications",
          description: "Unread routing and care updates",
          showNotificationBadge: true,
        },
        {
          to: "/patients",
          label: "Patients",
          description: "Conversations and records",
          showUnreadBadge: true,
        },
      ];
  const sidebarThemeClassName = isDark
    ? "border-slate-800 bg-slate-950 text-slate-100"
    : "border-slate-200 bg-white text-slate-900";
  const sidebarMutedTextClassName = isDark ? "text-slate-400" : "text-slate-500";
  const sidebarEyebrowClassName = isDark ? "text-slate-500" : "text-slate-400";
  const closeButtonClassName = isDark
    ? "border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
    : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900";
  const inactiveNavClassName = isDark
    ? "text-slate-300 hover:bg-slate-900 hover:text-white"
    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950";
  const themeButtonClassName = isDark
    ? "border-slate-800 bg-slate-900 text-slate-100 hover:border-slate-700 hover:bg-slate-900/80"
    : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-slate-100";
  const themeIconClassName = isDark
    ? "bg-slate-800 text-slate-100"
    : "bg-white text-slate-700 shadow-sm";
  const footerBorderClassName = isDark ? "border-slate-800" : "border-slate-200";

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
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col overflow-hidden border-r px-5 py-6 shadow-2xl transition-transform duration-300 lg:z-40 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          sidebarThemeClassName
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <p className={`text-[11px] uppercase tracking-[0.28em] ${sidebarEyebrowClassName}`}>
              {isAdmin ? "Admin Workspace" : "Doctor Workspace"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Omar MedPlus
            </h1>
            <p className={`mt-2 text-sm ${sidebarMutedTextClassName}`}>
              {currentUser?.name || (isAdmin ? "Admin" : "Doctor")} |{" "}
              {currentUser?.role || (isAdmin ? "admin" : "doctor")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border p-2 transition lg:hidden ${closeButtonClassName}`}
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
                    : inactiveNavClassName
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p
                      className={`mt-1 text-xs ${
                        isActive ? "text-blue-100" : sidebarMutedTextClassName
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
                  {item.showNotificationBadge && unreadCount > 0 && (
                    <span className="min-w-7 rounded-full bg-red-500 px-2 py-1 text-center text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`mt-8 border-t pt-5 ${footerBorderClassName}`}>
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${themeButtonClassName}`}
          >
            <span className="flex items-center gap-3">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${themeIconClassName}`}>
                {isDark ? <SunIcon /> : <MoonIcon />}
              </span>
              <span>
                {isDark ? "Light mode" : "Dark mode"}
              </span>
            </span>
            <span className={`text-xs ${sidebarMutedTextClassName}`}>
              {isDark ? "On" : "Off"}
            </span>
          </button>

          <p className={`mt-4 text-xs ${sidebarMutedTextClassName}`}>
            {isAdmin
              ? "Built for intake routing, staffing control and clinical oversight."
              : "Built for fast triage, follow-up and remote care."}
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
