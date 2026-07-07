import { useState, useEffect } from "react";

export default function SDOLayout({
  children,
  setActivePage,
  activePage,
  handleLogout,
}) {
  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
      key: "cases",
      label: "Disciplinary cases",
      icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
    },
    {
      key: "lostfound",
      label: "Lost & found",
      icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    },
    {
      key: "profile",
      label: "Profile",
      icon: "M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.43-2.53a1 1 0 0 0 .2-1.09l-.06-.16-1-1.73a1 1 0 0 1 .02-.99l.96-1.74a1 1 0 0 0-.24-1.28l-1.41-1.41a1 1 0 0 0-1.28-.24l-1.74.96a1 1 0 0 1-.99.02l-1.73-1-.16-.06a1 1 0 0 0-1.09.2L10.6 2.3a1 1 0 0 0-.3.71V5a1 1 0 0 1-.69.95l-1.9.63a1 1 0 0 0-.61.61L6.47 9.1A1 1 0 0 1 5.52 9.8H3.5a1 1 0 0 0-.71.3L1.3 11.6a1 1 0 0 0-.2 1.09l.06.16 1 1.73a1 1 0 0 1-.02.99l-.96 1.74a1 1 0 0 0 .24 1.28l1.41 1.41a1 1 0 0 0 1.28.24l1.74-.96a1 1 0 0 1 .99-.02l1.73 1 .16.06a1 1 0 0 0 1.09-.2l1.49-1.49a1 1 0 0 0 .3-.71V19a1 1 0 0 1 .69-.95l1.9-.63a1 1 0 0 0 .61-.61l.63-1.9a1 1 0 0 1 .95-.69H20.5a1 1 0 0 0 .71-.3l1.49-1.49z",
    },
  ];

  // ---- Dark mode (self-contained; toggles the `dark` class on <html>) ----
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("evosas-theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("evosas-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("evosas-theme", "light");
    }
  }, [isDark]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeLabel =
    navItems.find((n) => n.key === activePage)?.label ?? "Dashboard";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-neutral-950 transition-colors duration-300">
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 flex-shrink-0 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800
          flex flex-col`}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-200 dark:border-neutral-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
            E
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              EvOSAS
            </p>
            <p className="text-[11px] text-gray-400 dark:text-neutral-500 truncate">
              SDO Console
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-600">
            Menu
          </p>
          {navItems.map((item) => {
            const active = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActivePage(item.key);
                  setSidebarOpen(false);
                }}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${
                    active
                      ? "bg-pink-600 text-white shadow-sm shadow-pink-600/30"
                      : "text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <svg
                  className={`w-[18px] h-[18px] shrink-0 transition-transform duration-150 ${
                    active ? "" : "group-hover:scale-110"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-neutral-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300
              hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400
              transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="h-16 flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
              {activeLabel}
            </h2>
          </div>

          <button
            onClick={() => setIsDark((v) => !v)}
            aria-label="Toggle dark mode"
            className="relative w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-150"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.72 0l-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}