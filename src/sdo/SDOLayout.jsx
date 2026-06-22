import { useState } from "react";

export default function SDOLayout({ children, setActivePage, activePage, handleLogout }) {
  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { key: "add-case", label: "Add Case", icon: "M12 4v16m8-8H4" },
    { key: "cases", label: "Disciplinary cases", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
    { key: "lostfound", label: "Lost & found", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* SIDEBAR */}
      <aside className="w-56 bg-[#1a1a2e] text-white flex flex-col p-4 gap-1 flex-shrink-0">

        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="text-sm text-center font-medium">SDO Account</p>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                activePage === item.key
                  ? "bg-[#d4537e] text-white"
                  : "text-white/60 hover:bg-white/10"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>

              



          ))}
        </nav>

        <div className="mt-auto text-center">
          <button
            onClick={handleLogout}
            className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition shadow-md"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}