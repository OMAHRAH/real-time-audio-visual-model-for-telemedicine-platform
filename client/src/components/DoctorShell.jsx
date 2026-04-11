import { useCallback, useEffect, useState } from "react";
import Sidebar from "./sidebar";

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

function DoctorShell({ title, subtitle = "", actions = null, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen lg:h-screen">
        <Sidebar
          mobileOpen={sidebarOpen}
          onClose={handleCloseSidebar}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-72 lg:h-screen lg:overflow-y-auto">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-100 backdrop-blur transition-colors">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 lg:hidden"
                  aria-label="Open navigation"
                >
                  <MenuIcon />
                </button>

                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Care Hub
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {actions && <div className="shrink-0">{actions}</div>}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default DoctorShell;
