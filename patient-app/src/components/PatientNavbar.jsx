import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getStoredUser, logout } from "../auth";
import useUnreadChats from "../hooks/useUnreadChats";

function MenuIcon({ className = "h-5 w-5" }) {
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
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

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
    description: "Overview and quick actions",
  },
  {
    to: "/appointments",
    label: "Appointments",
    description: "Bookings and visit history",
  },
  {
    to: "/vitals",
    label: "Daily Vitals",
    description: "Submit and review readings",
  },
  {
    to: "/chat",
    label: "Chat",
    description: "Message and call doctors",
    showUnreadBadge: true,
  },
];

const desktopLinkClassName = ({ isActive }) =>
  `rounded-full px-3 py-2 text-sm transition ${
    isActive ? "bg-white text-blue-700" : "text-blue-100 hover:text-white"
  }`;

export default function PatientNavbar() {
  const user = getStoredUser();
  const { totalUnreadConversations } = useUnreadChats();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    window.location.href = "/login";
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-blue-500/30 bg-blue-700 text-white shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.25em] text-blue-100">
              Patient Portal
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
              Omar MedPlus
            </h1>
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={desktopLinkClassName}
              >
                <span className="flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.showUnreadBadge && totalUnreadConversations > 0 && (
                    <span className="min-w-6 rounded-full bg-red-500 px-2 py-0.5 text-center text-xs font-semibold text-white">
                      {totalUnreadConversations}
                    </span>
                  )}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name || "Patient"}</p>
              <p className="text-xs text-blue-100">{user?.email || ""}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
            >
              Logout
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-2xl border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/15 lg:hidden"
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      <div
        aria-hidden={!mobileOpen}
        onClick={closeMobileMenu}
        className={`fixed inset-0 z-40 bg-slate-950/60 transition lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex h-screen w-80 max-w-[88vw] flex-col border-l border-slate-200 bg-white px-5 py-6 text-slate-900 shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-blue-600">
              Patient Portal
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Omar MedPlus
            </h2>
            <p className="mt-3 text-sm font-medium text-slate-900">
              {user?.name || "Patient"}
            </p>
            <p className="text-sm text-slate-500">{user?.email || ""}</p>
          </div>

          <button
            type="button"
            onClick={closeMobileMenu}
            className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
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
              end={item.to === "/"}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `flex items-center justify-between gap-4 rounded-2xl px-4 py-3 transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
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

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 inline-flex self-start rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-600"
        >
          Logout
        </button>
      </aside>
    </>
  );
}
