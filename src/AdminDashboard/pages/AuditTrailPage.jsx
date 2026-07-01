// ============================================================
//  AuditTrailPage.jsx  —  EVOSAS Audit Trail
//  Pink-600 theme + Dark Mode
//  All logic is self-contained; no existing logic is changed.
// ============================================================

import { useState, useEffect, useMemo, useRef } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase/firebase"; // ← adjust if needed
import {
  Search,
  Download,
  Printer,
  Filter,
  Activity,
  Users,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  FilePlus,
  FilePen,
  Trash2,
  Eye,
  ShieldCheck,
  RefreshCw,
  BarChart2,
  X,
} from "lucide-react";

// ─── tiny helpers ────────────────────────────────────────────
const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateTime = (ts) => {
  if (!ts) return "—";
  return `${formatDate(ts)}, ${formatTime(ts)}`;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── action → icon + colour ──────────────────────────────────
const actionMeta = (action = "") => {
  const a = action.toLowerCase();
  if (a.includes("logged in"))
    return { Icon: LogIn, bg: "bg-emerald-100 text-emerald-600", dark: "bg-emerald-900/30 text-emerald-400" };
  if (a.includes("logged out"))
    return { Icon: LogOut, bg: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" };
  if (a.includes("add") || a.includes("creat") || a.includes("submit"))
    return { Icon: FilePlus, bg: "bg-blue-100 text-blue-600", dark: "bg-blue-900/30 text-blue-400" };
  if (a.includes("edit") || a.includes("updat") || a.includes("chang"))
    return { Icon: FilePen, bg: "bg-amber-100 text-amber-600", dark: "bg-amber-900/30 text-amber-400" };
  if (a.includes("delet") || a.includes("remov"))
    return { Icon: Trash2, bg: "bg-red-100 text-red-600", dark: "bg-red-900/30 text-red-400" };
  if (a.includes("view"))
    return { Icon: Eye, bg: "bg-purple-100 text-purple-600", dark: "bg-purple-900/30 text-purple-400" };
  if (a.includes("approv") || a.includes("publish"))
    return { Icon: ShieldCheck, bg: "bg-pink-100 text-pink-600", dark: "bg-pink-900/30 text-pink-400" };
  return { Icon: Activity, bg: "bg-gray-100 text-gray-500", dark: "bg-gray-800 text-gray-400" };
};

const ITEMS_PER_PAGE = 15;

// ─── MODULE BADGE ────────────────────────────────────────────
const ModuleBadge = ({ module, darkMode }) => {
  const colours = {
    Cases: "bg-pink-100 text-pink-700",
    "Lost & Found": "bg-blue-100 text-blue-700",
    Users: "bg-purple-100 text-purple-700",
    Authentication: "bg-emerald-100 text-emerald-700",
    "By-Laws": "bg-amber-100 text-amber-700",
    Evaluation: "bg-indigo-100 text-indigo-700",
    Profile: "bg-rose-100 text-rose-700",
  };
  const darkColours = {
    Cases: "bg-pink-900/30 text-pink-400",
    "Lost & Found": "bg-blue-900/30 text-blue-400",
    Users: "bg-purple-900/30 text-purple-400",
    Authentication: "bg-emerald-900/30 text-emerald-400",
    "By-Laws": "bg-amber-900/30 text-amber-400",
    Evaluation: "bg-indigo-900/30 text-indigo-400",
    Profile: "bg-rose-900/30 text-rose-400",
  };
  const cls = darkMode
    ? darkColours[module] || "bg-gray-700 text-gray-300"
    : colours[module] || "bg-gray-100 text-gray-600";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {module || "System"}
    </span>
  );
};

// ─── STAT CARD ───────────────────────────────────────────────
const StatCard = ({ label, value, Icon, accent, darkMode }) => (
  <div
    className={`rounded-3xl p-5 border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
      darkMode
        ? "bg-gray-900/60 border-gray-800 text-white"
        : "bg-white border-gray-100"
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </p>
      <div className={`p-2 rounded-xl ${accent}`}>
        <Icon size={15} />
      </div>
    </div>
    <p className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>{value}</p>
  </div>
);

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function AuditTrailPage({ darkMode }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [filterUser, setFilterUser] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // view
  const [viewMode, setViewMode] = useState("table"); // "table" | "timeline"
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null); // detail drawer

  const printRef = useRef(null);

  // ── Real-time listener ──────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "auditTrail"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Derived values for filters ──────────────────────────────
  const modules = useMemo(
    () => ["All", ...new Set(logs.map((l) => l.module).filter(Boolean))],
    [logs]
  );
  const roles = useMemo(
    () => ["All", ...new Set(logs.map((l) => l.performedBy?.role).filter(Boolean))],
    [logs]
  );
  const users = useMemo(
    () => ["All", ...new Set(logs.map((l) => l.performedBy?.name).filter(Boolean))],
    [logs]
  );
  const actions = useMemo(
    () => ["All", ...new Set(logs.map((l) => l.action).filter(Boolean))],
    [logs]
  );

  // ── Stats ───────────────────────────────────────────────────
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

  const todayLogs = logs.filter((l) => toDate(l.timestamp) >= todayStart);
  const weekLogs = logs.filter((l) => toDate(l.timestamp) >= weekStart);
  const monthLogs = logs.filter((l) => toDate(l.timestamp) >= monthStart);
  const loginCount = todayLogs.filter((l) => l.action === "Logged In").length;

  const mostActiveUser = useMemo(() => {
    const counts = {};
    logs.forEach((l) => {
      const n = l.performedBy?.name || "Unknown";
      counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [logs]);

  const mostEditedModule = useMemo(() => {
    const counts = {};
    logs.forEach((l) => {
      const m = l.module || "Unknown";
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [logs]);

  // ── Filtered list ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const term = search.toLowerCase();
      const matchSearch =
        !term ||
        l.action?.toLowerCase().includes(term) ||
        l.module?.toLowerCase().includes(term) ||
        l.documentTitle?.toLowerCase().includes(term) ||
        l.performedBy?.name?.toLowerCase().includes(term) ||
        l.performedBy?.email?.toLowerCase().includes(term) ||
        l.description?.toLowerCase().includes(term);

      const matchModule = filterModule === "All" || l.module === filterModule;
      const matchAction = filterAction === "All" || l.action === filterAction;
      const matchRole = filterRole === "All" || l.performedBy?.role === filterRole;
      const matchUser = filterUser === "All" || l.performedBy?.name === filterUser;

      const ts = toDate(l.timestamp);
      const matchFrom = !dateFrom || (ts && ts >= new Date(dateFrom));
      const matchTo =
        !dateTo || (ts && ts <= new Date(new Date(dateTo).setHours(23, 59, 59)));

      return (
        matchSearch &&
        matchModule &&
        matchAction &&
        matchRole &&
        matchUser &&
        matchFrom &&
        matchTo
      );
    });
  }, [logs, search, filterModule, filterAction, filterRole, filterUser, dateFrom, dateTo]);

  // ── Pagination ──────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSearch("");
    setFilterModule("All");
    setFilterAction("All");
    setFilterRole("All");
    setFilterUser("All");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // ── Export CSV ──────────────────────────────────────────────
  const exportCSV = () => {
    const headers = [
      "Timestamp", "Action", "Module", "Document Title",
      "Document ID", "Performed By", "Email", "Role",
      "Department", "Description",
    ];
    const rows = filtered.map((l) => [
      formatDateTime(l.timestamp),
      l.action || "",
      l.module || "",
      l.documentTitle || "",
      l.documentId || "",
      l.performedBy?.name || "",
      l.performedBy?.email || "",
      l.performedBy?.role || "",
      l.performedBy?.department || "",
      l.description || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AuditTrail_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Print ───────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ─── shared styles ─────────────────────────────────────────
  const card = `rounded-3xl border shadow-sm transition-all duration-300 ${
    darkMode ? "bg-gray-900/60 border-gray-800" : "bg-white border-gray-100"
  }`;
  const inputCls = `text-sm rounded-xl border px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
    darkMode
      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
      : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
  }`;
  const th = `py-3 px-4 text-xs font-semibold uppercase tracking-wider text-left ${
    darkMode ? "text-gray-400 bg-gray-800/60" : "text-gray-500 bg-gray-50"
  }`;

  return (
    <div
      className={`flex-1 overflow-auto p-5 sm:p-7 transition-colors duration-300 ${
        darkMode ? "bg-[#0b1120] text-white" : "bg-slate-50 text-gray-900"
      }`}
    >
      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
            Audit Trail
          </h1>
          <p className={`mt-1.5 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Full activity log — every action tracked in real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode(viewMode === "table" ? "timeline" : "table")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
              darkMode
                ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {viewMode === "table" ? <Clock size={15} /> : <BarChart2 size={15} />}
            {viewMode === "table" ? "Timeline View" : "Table View"}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-pink-600 text-white shadow-sm shadow-pink-500/30 transition-all duration-200 hover:bg-pink-700 active:scale-[0.98]"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
              darkMode
                ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-7">
        <StatCard label="Total Logs" value={logs.length} Icon={Activity} accent="bg-pink-100 text-pink-600" darkMode={darkMode} />
        <StatCard label="Today" value={todayLogs.length} Icon={CalendarDays} accent="bg-blue-100 text-blue-600" darkMode={darkMode} />
        <StatCard label="This Week" value={weekLogs.length} Icon={CalendarDays} accent="bg-indigo-100 text-indigo-600" darkMode={darkMode} />
        <StatCard label="This Month" value={monthLogs.length} Icon={CalendarDays} accent="bg-purple-100 text-purple-600" darkMode={darkMode} />
        <StatCard label="Logins Today" value={loginCount} Icon={LogIn} accent="bg-emerald-100 text-emerald-600" darkMode={darkMode} />
        <StatCard label="Top User" value={mostActiveUser.split(" ")[0]} Icon={Users} accent="bg-amber-100 text-amber-600" darkMode={darkMode} />
      </div>

      {/* ── FILTERS ────────────────────────────────────── */}
      <div className={`${card} p-5 mb-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-3">

          {/* search */}
          <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-1">
            <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-gray-500" : "text-gray-400"}`} />
            <input
              placeholder="Search action, user, record…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`${inputCls} w-full pl-9`}
            />
          </div>

          <select value={filterModule} onChange={(e) => { setFilterModule(e.target.value); setPage(1); }} className={inputCls}>
            {modules.map((m) => <option key={m}>{m}</option>)}
          </select>

          <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} className={inputCls}>
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>

          <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }} className={inputCls}>
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>

          <select value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(1); }} className={inputCls}>
            {users.map((u) => <option key={u}>{u}</option>)}
          </select>

          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={`${inputCls} flex-1`} />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={`${inputCls} flex-1`} />
          </div>

          <button
            onClick={resetFilters}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
              darkMode
                ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <RefreshCw size={14} /> Clear Filters
          </button>
        </div>

        <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
          Showing <span className="font-semibold text-pink-600">{filtered.length}</span> of {logs.length} records
          {mostEditedModule !== "—" && <> · Most edited module: <span className="font-semibold">{mostEditedModule}</span></>}
        </p>
      </div>

      {/* ── TABLE VIEW ─────────────────────────────────── */}
      {viewMode === "table" && (
        <div className={`${card} overflow-hidden mb-6`} ref={printRef}>
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <RefreshCw size={26} className="animate-spin text-pink-500" />
              <p className={darkMode ? "text-gray-400" : "text-gray-500"}>Loading audit logs…</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <Activity size={32} className={darkMode ? "text-gray-700" : "text-gray-300"} />
              <p className={darkMode ? "text-gray-500" : "text-gray-400"}>No audit records match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
                <thead>
                  <tr>
                    <th className={`${th} rounded-l-none pl-5`}>Timestamp</th>
                    <th className={th}>Action</th>
                    <th className={th}>Module</th>
                    <th className={th}>Record</th>
                    <th className={th}>Performed By</th>
                    <th className={th}>Role</th>
                    <th className={`${th} rounded-r-none pr-5`}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log, idx) => {
                    const { Icon, bg, dark } = actionMeta(log.action);
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelected(log)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          darkMode
                            ? isEven ? "bg-gray-900/20" : "bg-transparent"
                            : isEven ? "bg-gray-50/50" : "bg-transparent"
                        } ${darkMode ? "hover:bg-gray-800/60" : "hover:bg-pink-50/60"}`}
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-5 rounded-l-xl">
                          <p className={`font-medium text-xs ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                            {formatDate(log.timestamp)}
                          </p>
                          <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                            {formatTime(log.timestamp)}
                          </p>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${darkMode ? dark : bg}`}>
                              <Icon size={13} />
                            </div>
                            <span className={`font-medium ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                              {log.action}
                            </span>
                          </div>
                        </td>

                        {/* Module */}
                        <td className="py-3.5 px-4">
                          <ModuleBadge module={log.module} darkMode={darkMode} />
                        </td>

                        {/* Record */}
                        <td className="py-3.5 px-4">
                          <p className={`font-mono text-xs ${darkMode ? "text-pink-400" : "text-pink-600"}`}>
                            {log.documentId ? log.documentId.slice(0, 8) + "…" : "—"}
                          </p>
                          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {log.documentTitle || ""}
                          </p>
                        </td>

                        {/* Performed By */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {log.performedBy?.photoURL ? (
                              <img
                                src={log.performedBy.photoURL}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover ring-2 ring-pink-200"
                              />
                            ) : (
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-pink-200 ${
                                darkMode ? "bg-gray-700 text-pink-400" : "bg-pink-100 text-pink-600"
                              }`}>
                                {(log.performedBy?.name || "?")[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className={`text-xs font-medium ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                                {log.performedBy?.name || "Unknown"}
                              </p>
                              <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                                {log.performedBy?.email || ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {log.performedBy?.role || "—"}
                          </span>
                        </td>

                        {/* Details */}
                        <td className="py-3.5 px-5 rounded-r-xl">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(log); }}
                            className="text-xs font-medium text-pink-600 hover:text-pink-700 transition-colors"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {!loading && filtered.length > ITEMS_PER_PAGE && (
            <div className={`flex items-center justify-between px-5 py-4 border-t ${darkMode ? "border-gray-800" : "border-gray-100"}`}>
              <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-2 rounded-xl border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                    darkMode ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <ChevronLeft size={15} />
                </button>

                {/* page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all duration-200 ${
                        page === p
                          ? "bg-pink-600 text-white shadow-sm"
                          : darkMode
                          ? "border border-gray-700 text-gray-300 hover:bg-gray-800"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`p-2 rounded-xl border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                    darkMode ? "border-gray-700 hover:bg-gray-800" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TIMELINE VIEW ──────────────────────────────── */}
      {viewMode === "timeline" && (
        <div className={`${card} p-6 mb-6`}>
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <RefreshCw size={26} className="animate-spin text-pink-500" />
              <p className={darkMode ? "text-gray-400" : "text-gray-500"}>Loading…</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <Activity size={32} className={darkMode ? "text-gray-700" : "text-gray-300"} />
              <p className={darkMode ? "text-gray-500" : "text-gray-400"}>No records found.</p>
            </div>
          ) : (
            <ol className="relative border-l-2 border-pink-200 ml-4 space-y-0">
              {paginated.map((log, idx) => {
                const { Icon, bg, dark } = actionMeta(log.action);
                return (
                  <li key={log.id} className="mb-0 ml-6">
                    {/* dot */}
                    <span className="absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full ring-4 ring-white bg-pink-600 dark:ring-gray-900">
                      <Icon size={10} className="text-white" />
                    </span>

                    <div
                      onClick={() => setSelected(log)}
                      className={`ml-2 cursor-pointer rounded-2xl p-4 mb-4 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        darkMode
                          ? "bg-gray-900/40 border-gray-800 hover:bg-gray-800"
                          : "bg-white border-gray-100 hover:border-pink-100"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${darkMode ? dark : bg}`}>
                            <Icon size={12} />
                          </div>
                          <span className={`font-semibold text-sm ${darkMode ? "text-white" : "text-gray-800"}`}>
                            {log.action}
                          </span>
                          <ModuleBadge module={log.module} darkMode={darkMode} />
                        </div>
                        <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                          {formatTime(log.timestamp)} · {formatDate(log.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {log.performedBy?.photoURL ? (
                          <img src={log.performedBy.photoURL} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? "bg-gray-700 text-pink-400" : "bg-pink-100 text-pink-600"}`}>
                            {(log.performedBy?.name || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <p className={`text-xs font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {log.performedBy?.name || "Unknown"} · {log.performedBy?.role || ""}
                        </p>
                      </div>

                      {log.documentTitle && (
                        <p className={`text-xs mt-1 ${darkMode ? "text-pink-400" : "text-pink-600"}`}>
                          {log.documentTitle}
                        </p>
                      )}

                      {log.description && (
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                          {log.description}
                        </p>
                      )}
                    </div>

                    {/* date divider */}
                    {idx < paginated.length - 1 &&
                      formatDate(log.timestamp) !== formatDate(paginated[idx + 1]?.timestamp) && (
                        <div className={`ml-2 flex items-center gap-2 mb-4 mt-1`}>
                          <span className={`text-xs font-semibold px-3 py-0.5 rounded-full ${
                            darkMode ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"
                          }`}>
                            {formatDate(paginated[idx + 1]?.timestamp)}
                          </span>
                        </div>
                      )}
                  </li>
                );
              })}
            </ol>
          )}

          {/* TIMELINE PAGINATION */}
          {!loading && filtered.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  darkMode ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className={`px-4 py-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  darkMode ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL DRAWER / MODAL ──────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-end z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg h-full max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl p-7 shadow-2xl border transition-colors duration-300 ${
              darkMode
                ? "bg-gray-900 border-gray-800 text-white"
                : "bg-white border-gray-100 text-gray-900"
            }`}
          >
            {/* header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-pink-600">Log Detail</h2>
              <button
                onClick={() => setSelected(null)}
                className={`p-2 rounded-full transition-all ${darkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
              >
                <X size={20} />
              </button>
            </div>

            {/* action + module */}
            <div className="flex items-center gap-3 mb-5">
              {(() => {
                const { Icon, bg, dark } = actionMeta(selected.action);
                return (
                  <div className={`p-3 rounded-2xl ${darkMode ? dark : bg}`}>
                    <Icon size={20} />
                  </div>
                );
              })()}
              <div>
                <p className={`font-bold text-base ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {selected.action}
                </p>
                <ModuleBadge module={selected.module} darkMode={darkMode} />
              </div>
            </div>

            {/* sections */}
            {[
              {
                label: "Timestamp",
                value: formatDateTime(selected.timestamp),
              },
              {
                label: "Document",
                value: selected.documentTitle || "—",
              },
              {
                label: "Document ID",
                value: selected.documentId || "—",
                mono: true,
              },
              {
                label: "Description",
                value: selected.description || "—",
              },
            ].map(({ label, value, mono }) => (
              <div key={label} className={`mb-4 pb-4 border-b ${darkMode ? "border-gray-800" : "border-gray-100"}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  {label}
                </p>
                <p className={`text-sm font-medium ${mono ? "font-mono text-pink-600" : ""} ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                  {value}
                </p>
              </div>
            ))}

            {/* performed by */}
            <div className={`mb-4 pb-4 border-b ${darkMode ? "border-gray-800" : "border-gray-100"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                Performed By
              </p>
              <div className="flex items-center gap-3">
                {selected.performedBy?.photoURL ? (
                  <img src={selected.performedBy.photoURL} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-300" />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ring-2 ring-pink-200 ${darkMode ? "bg-gray-700 text-pink-400" : "bg-pink-100 text-pink-600"}`}>
                    {(selected.performedBy?.name || "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className={`font-semibold text-sm ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {selected.performedBy?.name || "Unknown"}
                  </p>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {selected.performedBy?.email}
                  </p>
                  <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {selected.performedBy?.role}{selected.performedBy?.department ? ` · ${selected.performedBy.department}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* old / new data */}
            {(selected.oldData || selected.newData) && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {selected.oldData && (
                  <div className={`rounded-2xl p-4 ${darkMode ? "bg-red-900/20 border border-red-800" : "bg-red-50 border border-red-100"}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-red-400" : "text-red-500"}`}>
                      Previous Values
                    </p>
                    {Object.entries(selected.oldData).map(([k, v]) => (
                      <div key={k} className="mb-1">
                        <p className={`text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{k}</p>
                        <p className={`text-xs break-words ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                          {String(v) || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {selected.newData && (
                  <div className={`rounded-2xl p-4 ${darkMode ? "bg-emerald-900/20 border border-emerald-800" : "bg-emerald-50 border border-emerald-100"}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                      Updated Values
                    </p>
                    {Object.entries(selected.newData).map(([k, v]) => (
                      <div key={k} className="mb-1">
                        <p className={`text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{k}</p>
                        <p className={`text-xs break-words ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                          {String(v) || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* device info */}
            {(selected.browser || selected.device) && (
              <div className={`rounded-2xl p-4 ${darkMode ? "bg-gray-800/60" : "bg-gray-50"}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  Device Info
                </p>
                <p className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  {selected.device} · {selected.browser}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}