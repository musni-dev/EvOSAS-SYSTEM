import { useState } from "react";
import DisciplinaryPage from "./pages/DisciplinaryPage";
import LostFoundPage from "./pages/LostFoundPage";
import AttendancePage from "./pages/AttendancePage";
import EventsPage from "./pages/EventsPage";
import OrganizationsPage from "./pages/OrganizationsPage";
import UsersPage from "./pages/UsersPage";

const Icon = ({ name, size = 18 }) => {
   const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    discipline:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    lost: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    attendance: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>,
    events: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8"/></svg>,
    orgs: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  };

  return icons[name];
};

const pages = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "disciplinary", label: "Disciplinary", icon: "discipline" },
  { id: "lostfound", label: "Lost & Found", icon: "lost" },
  { id: "attendance", label: "Attendance", icon: "attendance" },
  { id: "events", label: "Events", icon: "events" },
  { id: "orgs", label: "Organizations", icon: "orgs" },
  { id: "users", label: "User Management", icon: "users" },
];

export default function Homepage() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200">

      {/* SIDEBAR */}
      <aside className={`relative backdrop-blur-xl bg-white/70 border-r border-white/40 transition-all duration-300 ${collapsed ? "w-20" : "w-64"} shadow-xl`}>

        {/* LOGO */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100/50">
          {!collapsed && (
            <div>
              <h1 className="font-black text-pink-500 text-lg">EvOSAS</h1>
              <p className="text-xs text-gray-400">Admin Portal</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            ☰
          </button>
        </div>

        {/* NAV */}
        <div className="p-3 space-y-2">
          {pages.map((p) => (
            <div
              key={p.id}
              onClick={() => setActive(p.id)}
              className={`flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-all duration-200 relative
              ${active === p.id
                ? "bg-pink-500 text-white shadow-lg shadow-pink-200"
                : "text-gray-500 hover:bg-white hover:shadow-sm"}`}
            >
              {active === p.id && (
                <div className="absolute left-0 w-1 h-6 bg-white rounded-full" />
              )}

              <Icon name={p.icon} />
              {!collapsed && <span className="font-medium text-sm">{p.label}</span>}
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">

        {/* TOPBAR */}
        <div className="h-16 bg-white/70 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 shadow-sm">

          <h2 className="font-semibold capitalize text-gray-800">{active}</h2>

          <div className="flex items-center gap-3">
            {/* LOGOUT BUTTON */}
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md transition"
            >
              Logout
            </button>

          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-6 overflow-auto">

          {/* DASHBOARD CARDS */}
          {active === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">

              {[
                { label: "Students", value: "3,842" },
                { label: "Cases", value: "47" },
                { label: "Lost Items", value: "23" },
                { label: "Events", value: "11" },
              ].map((c, i) => (
                <div
                  key={i}
                  className="bg-white/70 backdrop-blur-xl border border-white rounded-2xl p-5 shadow-md hover:scale-[1.02] transition"
                >
                  <p className="text-gray-400 text-sm">{c.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{c.value}</p>
                </div>
              ))}

            </div>
          )}

          {/* OTHER PAGES */}
          {active === "disciplinary" && <DisciplinaryPage />}
          {active === "lostfound" && <LostFoundPage />}
          {active === "attendance" && <AttendancePage />}
          {active === "events" && <EventsPage />}
          {active === "orgs" && <OrganizationsPage />}
          {active === "users" && <UsersPage />}

        </div>
      </div>
    </div>
  );
}