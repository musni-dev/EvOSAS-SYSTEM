import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {  addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, writeBatch,} from "firebase/firestore";
import { CalendarDays, Check, CheckCircle2, ChevronDown, Clock, Download, GraduationCap, Plus, QrCode, Search, StopCircle, Trash2, Users, X,
} from "lucide-react";
import { db } from "../../firebase/firebase";

function formatTimestamp(value) {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEventDate(value) {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "-";
  const [hour, minute] = value.split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute));
  return date.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getSessionEndDateTime(session) {
  if (!session?.eventDate || !session?.qrEndTime) return null;
  return new Date(`${session.eventDate}T${session.qrEndTime}`);
}

function isSessionExpired(session) {
  const end = getSessionEndDateTime(session);
  return end ? new Date() > end : false;
}

function StatCard({ icon: Icon, label, value, sub, color = "pink", darkMode }) {
  const colors = {
    pink: darkMode ? "bg-pink-500/10 text-pink-400" : "bg-pink-50 text-pink-600",
    green: darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600",
    blue: darkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600",
    amber: darkMode ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600",
  };

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border ${
        darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-pink-100"
      }`}
    >
      <div
        className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${colors[color]}`}
      >
        <Icon size={18} />
      </div>
      <p className={`text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
        {value}
      </p>
      <p className={`mt-0.5 text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </p>
      {sub && (
        <p className={`mt-1 text-xs ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SessionBadge({ status, expired, darkMode }) {
  if (expired) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
          darkMode
            ? "bg-red-500/10 text-red-400 border-red-500/30"
            : "bg-red-50 text-red-700 border-red-200"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Expired
      </span>
    );
  }

  if (status === "active") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
          darkMode
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
        darkMode
          ? "bg-gray-800 text-gray-400 border-gray-700"
          : "bg-gray-100 text-gray-500 border-gray-200"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Ended
    </span>
  );
}

export default function AttendancePage( {darkMode} ) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [qrEndTime, setQrEndTime] = useState("");
  const [loading, setLoading] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [records, setRecords] = useState([]);

  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const qrRef = useRef(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  const allSessionIds = useMemo(
    () => sessions.map((session) => session.id),
    [sessions]
  );

  const allSessionsSelected =
    allSessionIds.length > 0 &&
    selectedSessionIds.length === allSessionIds.length;

  const selectedSessionExpired = selectedSession
    ? isSessionExpired(selectedSession)
    : false;

const qrValue =
  selectedSession &&
  selectedSession.status === "active" &&
  !selectedSessionExpired
    ? JSON.stringify({
        sessionId: selectedSession.id,
      })
    : "";

  const positions = useMemo(
    () => [...new Set(records.map((r) => r.position).filter(Boolean))].sort(),
    [records]
  );

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase();

    return records.filter((r) => {
      const matchSearch =
        !q ||
        (r.studentName || "").toLowerCase().includes(q) ||
        (r.studentId || "").toLowerCase().includes(q) ||
        (r.position || "").toLowerCase().includes(q);

      const matchPosition = !filterPosition || r.position === filterPosition;

      return matchSearch && matchPosition;
    });
  }, [records, search, filterPosition]);

  const stats = useMemo(() => {
    const total = records.length;
    const positionsCount = new Set(
      records.map((r) => r.position).filter(Boolean)
    ).size;

    const today = records.filter((r) => {
      const value = r.timeIn || r.timestamp;
      const d = value?.toDate?.();
      return d && d.toDateString() === new Date().toDateString();
    }).length;

    return { total, positionsCount, today };
  }, [records]);

  useEffect(() => {
    const q = query(collection(db, "sessions"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSessions(data);

      if (!selectedSessionId && data.length > 0) {
        setSelectedSessionId(data[0].id);
      }
    });

    return unsub;
  }, [selectedSessionId]);

useEffect(() => {
  if (!selectedSessionId) {
    setRecords([]);
    return;
  }

  const q = query(
    collection(db, "attendance"),
    where("sessionId", "==", selectedSessionId)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("🔥 Realtime attendance:", data);

      setRecords(data);
    },
    (error) => {
      console.error("Firestore error:", error);
    }
  );

  return () => unsub();
}, [selectedSessionId]);

  async function handleCreateSession(e) {
    e.preventDefault();

    if (!title.trim() || !eventDate || !eventTime || !qrEndTime) return;

    setLoading(true);

    try {
      const ref = await addDoc(collection(db, "sessions"), {
        title: title.trim(),
        eventDate,
        eventTime,
        qrEndTime,
        status: "active",
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setEventDate("");
      setEventTime("");
      setQrEndTime("");
      setSelectedSessionId(ref.id);
      setShowCreateModal(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleEndSession(sessionId) {
    if (!sessionId) return;
    await updateDoc(doc(db, "sessions", sessionId), { status: "ended" });
  }

  async function deleteSessions(sessionIds) {
    if (!sessionIds.length) return;

    const batch = writeBatch(db);

    for (const sessionId of sessionIds) {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("sessionId", "==", sessionId)
      );

      const attendanceSnap = await getDocs(attendanceQuery);

      attendanceSnap.forEach((recordDoc) => {
        batch.delete(recordDoc.ref);
      });

      batch.delete(doc(db, "sessions", sessionId));
    }

    await batch.commit();

    if (sessionIds.includes(selectedSessionId)) {
      setSelectedSessionId("");
      setRecords([]);
    }

    setSelectedSessionIds([]);
  }

  async function handleDeleteSession(sessionId) {
    if (!sessionId) return;

    const ok = window.confirm(
      "Delete this attendance session? This will also remove its QR code and attendance records."
    );

    if (!ok) return;

    await deleteSessions([sessionId]);
  }

  async function handleDeleteSelectedSessions() {
    if (!selectedSessionIds.length) return;

    const ok = window.confirm(
      `Delete ${selectedSessionIds.length} selected session/s? This will also delete their QR codes and attendance records.`
    );

    if (!ok) return;

    await deleteSessions(selectedSessionIds);
    setShowSessionModal(false);
  }

  function toggleSessionSelection(sessionId) {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  }

  function handleToggleSelectAllSessions() {
    if (allSessionsSelected) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(allSessionIds);
    }
  }

  function handleViewSession(sessionId) {
    setSelectedSessionId(sessionId);
    setShowSessionModal(false);
  }

  const handleDownloadQR = useCallback(() => {
    const qrCanvas = qrRef.current?.querySelector("canvas");
    if (!qrCanvas || !selectedSession) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 420;
    canvas.height = 560;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#9d174d";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText(selectedSession.title || "Attendance QR Code", 210, 45);

    ctx.drawImage(qrCanvas, 85, 75, 250, 250);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 16px Arial";
    ctx.fillText("SSC Attendance System", 210, 365);

    ctx.fillStyle = "#4b5563";
    ctx.font = "14px Arial";
    ctx.fillText(
      `Event Date: ${formatEventDate(selectedSession.eventDate)}`,
      210,
      395
    );
    ctx.fillText(
      `Event Time: ${formatTime(selectedSession.eventTime)}`,
      210,
      420
    );
    ctx.fillText(`QR Ends: ${formatTime(selectedSession.qrEndTime)}`, 210, 445);

    ctx.fillStyle = "#be185d";
    ctx.font = "12px Arial";
    ctx.fillText("Scan this QR code to record attendance", 210, 490);

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");

    a.href = url;
    a.download = `${selectedSession.title || "attendance-qr"}-${
      selectedSession.eventDate || "date"
    }.png`;
    a.click();
  }, [selectedSession]);

  function exportCSV() {
    const headers = [
      "Student ID",
      "Position",
      "Name",
      "Session",
      "Time In",
      "Time Out",
    ];

    const rows = filteredRecords.map((r) => [
      r.studentId || "",
      r.position || "",
      r.studentName || "",
      selectedSession?.title || "",
      formatTimestamp(r.timeIn || r.timestamp),
      formatTimestamp(r.timeOut),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${selectedSession?.title || "attendance"}-records.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const getToday = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60 * 1000)
    .toISOString()
    .split("T")[0];
};

  return (
    <div className={`h-screen overflow-hidden flex flex-col ${ darkMode  ? "bg-gray-950 text-gray-100" : "bg-pink-50/60" }`}>
      <header className={`sticky top-0 z-20 backdrop-blur-sm border-b ${ darkMode  ? "bg-gray-900/90 border-gray-700"  : "bg-white/80 border-pink-100" }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-600">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <h1
                className={`text-sm font-semibold leading-tight ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                SSC Attendance System
              </h1>

              <p
                className={`text-xs hidden sm:block ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Student Council Portal
              </p>
            </div>
          </div>

          {selectedSession && (
            <SessionBadge
              status={selectedSession.status}
              expired={selectedSessionExpired}
              darkMode={darkMode}
            />
          )}
        </div>
      </header>

      <main className="mx-auto flex-1 max-w-7xl overflow-hidden px-4 py-6 md:px-8 w-full">
  <div className="h-full space-y-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Users} label="Total records" value={stats.total} darkMode={darkMode} />
          <StatCard
            icon={CheckCircle2}
            label="Checked in today"
            value={stats.today}
            color="green"
            sub={stats.today > 0 ? "Active session" : undefined}
            darkMode={darkMode}
          />
          <StatCard
            icon={CalendarDays}
            label="Sessions"
            value={sessions.length}
            color="blue"
            darkMode={darkMode}
          />
          <StatCard
            icon={GraduationCap}
            label="Positions"
            value={stats.positionsCount}
            color="amber"
            darkMode={darkMode}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-700 active:scale-[0.98]"
            >
              <Plus size={17} />
              Create Attendance Session
            </button>

            <div
                className={`rounded-xl p-5 shadow-sm border ${
                  darkMode
                    ? "bg-gray-900 border-gray-700"
                    : "bg-white border-pink-100"
                }`}
              >
              <div className={`mb-4 flex items-center gap-2 ${darkMode ? "text-pink-400" : "text-pink-700"}`}>
                <QrCode size={18} />
                <h2 className="text-sm font-semibold">QR Code (Click the QR Code) </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowSessionModal(true)}
               className={`mb-4 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm outline-none transition ${
                  darkMode
                    ? "bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                    : "bg-white border border-pink-700 hover:bg-pink-50"
                }`}
              >
                <span
                  className={
                    selectedSession
                      ? darkMode ? "text-white" : "text-black"
                      : darkMode ? "text-gray-500" : "text-gray-400"
                  }
                >
                  {selectedSession ? selectedSession.title : "Choose session"}
                </span>
                <ChevronDown size={14} className={darkMode ? "text-pink-400" : "text-pink-700"} />
              </button>

              {selectedSession ? (
                <div className="flex flex-col items-center gap-4">
                    <div
                      ref={qrRef}
                      className={`rounded-xl border p-4 cursor-pointer ${
                        darkMode
                          ? "bg-gray-800 border-gray-700"
                          : "bg-white border-pink-100"
                      }`}

                    onClick={() => qrValue && setShowQRModal(true)}
                    title="Click to enlarge"
                  >
                    {qrValue ? (
                      <QRCodeCanvas
                        value={qrValue}
                        size={200}
                        fgColor="#9d174d"
                        bgColor="#ffffff"
                        level="M"
                      />
                    ) : (
                      <div
                        className={`flex h-[200px] w-[200px] items-center justify-center rounded-lg text-center text-sm font-medium ${
                          darkMode
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-100 text-gray-500"
                        }`}>                      
                          QR code expired or ended
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {selectedSession.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      <Clock size={11} className="inline mr-1 -mt-0.5" />
                      {formatEventDate(selectedSession.eventDate)} at{" "}
                      {formatTime(selectedSession.eventTime)}
                    </p>
                    <p className={`text-xs mt-0.5 ${darkMode ? "text-red-400" : "text-red-500"}`}>
                      QR ends at {formatTime(selectedSession.qrEndTime)}
                    </p>
                  </div>

                  <div className="flex w-full gap-2">
                    <button
                      onClick={handleDownloadQR}
                      disabled={!qrValue}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-pink-600 px-3 py-2 text-xs font-medium text-white hover:bg-pink-700 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download size={13} /> Download QR
                    </button>

                    {selectedSession.status === "active" && (
                      <button
                        onClick={() => handleEndSession(selectedSession.id)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          darkMode
                            ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                            : "border-red-200 text-red-600 hover:bg-red-50"
                        }`}
                      >
                        <StopCircle size={13} /> End
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteSession(selectedSession.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        darkMode
                          ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                          : "border-red-200 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${darkMode ? "bg-pink-500/10" : "bg-pink-50"}`}>
                    <QrCode size={22} className={darkMode ? "text-pink-500/50" : "text-pink-300"} />
                  </div>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Create or select a session to generate a QR code.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            className={`rounded-xl shadow-sm border overflow-hidden ${
              darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-pink-100"
            }`}
          >
            <div className={`border-b px-5 py-4 ${darkMode ? "border-gray-700" : "border-pink-100"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className={`flex items-center gap-2 ${darkMode ? "text-pink-400" : "text-pink-700"}`}>
                  <Users size={18} />
                  <h2 className="text-sm font-semibold">
                    Attendance Records
                  </h2>
                  {records.length > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        darkMode ? "bg-pink-500/10 text-pink-400" : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      {filteredRecords.length}
                    </span>
                  )}
                </div>

                <button
                  onClick={exportCSV}
                  disabled={!filteredRecords.length}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    darkMode
                      ? "border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                      : "border-pink-200 text-pink-700 hover:bg-pink-50"
                  }`}
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search
                    size={14}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, ID, position..."
                    className={`w-full rounded-lg border py-2 pl-8 pr-8 text-xs outline-none transition ${
                      darkMode
                        ? "border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                        : "border-gray-200 bg-gray-50 focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100 placeholder:text-gray-400"
                    }`}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                        darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {positions.length > 0 && (
                  <div className="relative">
                    <select
                      value={filterPosition}
                      onChange={(e) => setFilterPosition(e.target.value)}
                      className={`appearance-none rounded-lg border py-2 pl-3 pr-7 text-xs outline-none transition ${
                        darkMode
                          ? "border-gray-700 bg-gray-800 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                          : "border-gray-200 bg-gray-50 focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100"
                      }`}
                    >
                      <option value="">All positions</option>
                      {positions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${
                        darkMode ? "text-gray-500" : "text-gray-400"
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? "border-gray-700 bg-gray-800/60" : "border-pink-100 bg-pink-50/70"}`}>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-pink-400" : "text-pink-800"}`}>
                      Student ID
                    </th>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-pink-400" : "text-pink-800"}`}>
                      Position
                    </th>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-pink-400" : "text-pink-800"}`}>
                      Name
                    </th>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-pink-400" : "text-pink-800"}`}>
                      Time In
                    </th>
                    <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-pink-400" : "text-pink-800"}`}>
                      Time Out
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className={`border-b transition ${
                        darkMode
                          ? "border-gray-800 hover:bg-gray-800/50"
                          : "border-gray-50 hover:bg-pink-50/40"
                      }`}
                    >
                      <td className={`px-5 py-3 font-mono text-xs font-bold ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                        {record.studentId || "-"}
                      </td>

                      <td className="px-5 py-3">
                        {record.position ? (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                              darkMode
                                ? "bg-pink-500/10 text-pink-400 border-pink-500/30"
                                : "bg-pink-50 text-pink-700 border-pink-100"
                            }`}
                          >
                            {record.position}
                          </span>
                        ) : (
                          <span className={darkMode ? "text-gray-500" : "text-gray-400"}>-</span>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              darkMode ? "bg-pink-500/10 text-pink-400" : "bg-pink-100 text-pink-700"
                            }`}
                          >
                            {getInitials(record.studentName)}
                          </div>
                          <span className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {record.studentName || "-"}
                          </span>
                        </div>
                      </td>

                      <td className={`px-5 py-3 text-xs ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <div className="flex items-center gap-1">
                          <Clock size={11} className={darkMode ? "text-gray-400" : "text-black"} />
                          {formatTimestamp(record.timeIn || record.timestamp)}
                        </div>
                      </td>

                      <td className={`px-5 py-3 text-xs ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        <div className="flex items-center gap-1">
                          <Clock size={11} className={darkMode ? "text-gray-400" : "text-black"} />
                          {formatTimestamp(record.timeOut)}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!records.length && (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${darkMode ? "bg-pink-500/10" : "bg-pink-50"}`}>
                            <Users size={22} className={darkMode ? "text-pink-500/50" : "text-pink-300"} />
                          </div>
                          <p className={`text-sm font-medium ${darkMode ? "text-gray-200" : "text-black"}`}>
                            No attendance records yet
                          </p>
                          <p className={`text-xs ${darkMode ? "text-gray-500" : "text-black"}`}>
                            Students will appear here after scanning the QR code.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {records.length > 0 && filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center">
                        <p className={`text-sm ${darkMode ? "text-gray-300" : "text-black"}`}>
                          No results for{" "}
                          <span className="font-medium">{search}</span>
                        </p>
                        <button
                          onClick={() => {
                            setSearch("");
                            setFilterPosition("");
                          }}
                          className={`mt-2 text-xs hover:underline ${darkMode ? "text-pink-400" : "text-pink-600"}`}
                        >
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredRecords.length > 0 && (
              <div className={`border-t px-5 py-2.5 ${darkMode ? "border-gray-700 bg-gray-800/40" : "border-pink-100 bg-pink-50/40"}`}>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-black"}`}>
                  Showing{" "}
                  <span className={darkMode ? "font-medium text-pink-400" : "font-medium text-pink-600"}>
                    {filteredRecords.length}
                  </span>{" "}
                  of{" "}
                  <span className={darkMode ? "font-medium text-pink-400" : "font-medium text-pink-600"}>
                    {records.length}
                  </span>{" "}
                  records
                  {selectedSession && (
                    <>
                      {" "}
                      for{" "}
                      <span className={darkMode ? "font-medium text-pink-300" : "font-medium text-pink-700"}>
                        {selectedSession.title}
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className={`relative w-full max-w-md rounded-2xl p-6 shadow-2xl ${
              darkMode ? "bg-gray-900 border border-gray-700" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className={`absolute right-4 top-4 transition ${
                darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <X size={20} />
            </button>

            <div className={`mb-5 flex items-center gap-2 ${darkMode ? "text-pink-400" : "text-pink-700"}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${darkMode ? "bg-pink-500/10" : "bg-pink-50"}`}>
                <Plus size={18} />
              </div>
              <div>
                <h2 className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Create Attendance Session
                </h2>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Set the event schedule and QR expiration time.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3">
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${darkMode ? "text-gray-300" : "text-black"}`}>
                  Session title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. SSC General Assembly"
                  required
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                    darkMode
                      ? "border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                      : "border-pink-200 bg-white text-black focus:border-pink-500 focus:ring-2 focus:ring-pink-100 placeholder:text-gray-400"
                  }`}
                />
              </div>

                <div>
                  <label className={`mb-1.5 block text-xs font-medium ${darkMode ? "text-gray-300" : "text-black"}`}>
                    Event date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                     min={getToday()}// Today onwards only
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                      darkMode
                        ? "border-gray-700 bg-gray-800 text-white [color-scheme:dark] focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                        : "border-pink-200 bg-white text-black focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                    }`}
                  />
                </div>

              <div>
                <label className={`mb-1.5 block text-xs font-medium ${darkMode ? "text-gray-300" : "text-black"}`}>
                  Event time
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                    darkMode
                      ? "border-gray-700 bg-gray-800 text-white [color-scheme:dark] focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                      : "border-pink-200 bg-white text-black focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  }`}
                />
              </div>

              <div>
                <label className={`mb-1.5 block text-xs font-medium ${darkMode ? "text-gray-300" : "text-black"}`}>
                  QR code end time
                </label>
                <input
                  type="time"
                  value={qrEndTime}
                  onChange={(e) => setQrEndTime(e.target.value)}
                  required
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${
                    darkMode
                      ? "border-gray-700 bg-gray-800 text-white [color-scheme:dark] focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                      : "border-pink-200 bg-white text-black focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                    darkMode
                      ? "border-red-500/40 text-red-400 hover:bg-gray-800"
                      : "border-red-500 text-red-600 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !title.trim() ||
                    !eventDate ||
                    !eventTime ||
                    !qrEndTime
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-pink-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <QrCode size={16} />
                  {loading ? "Creating..." : "Generate QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSessionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowSessionModal(false)}
        >
          <div
            className={`relative flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl shadow-2xl ${
              darkMode ? "bg-gray-900 border border-gray-700" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b px-5 py-4 ${darkMode ? "border-gray-700" : "border-pink-100"}`}>
              <div>
                <h2 className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Select Attendance Session
                </h2>
                <p className={`text-xs ${darkMode ? "text-pink-400" : "text-pink-500"}`}>
                  Click a card to view its QR code. Select cards to delete.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSessionModal(false)}
                className={`transition ${darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 ${darkMode ? "border-gray-700" : "border-pink-100"}`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-black"}`}>
                {selectedSessionIds.length} selected
              </p>

              <div className="flex items-center gap-2">
                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAllSessions}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      darkMode
                        ? "border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                        : "border-pink-200 text-pink-700 hover:bg-pink-50"
                    }`}
                  >
                    <Check size={13} />
                    {allSessionsSelected ? "Clear all" : "Select all"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDeleteSelectedSessions}
                  disabled={!selectedSessionIds.length}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    darkMode
                      ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                      : "border-red-200 text-red-600 hover:bg-red-50"
                  }`}
                >
                  <Trash2 size={13} />
                  Delete selected
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5">
              {sessions.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sessions.map((session) => {
                    const selectedForDelete = selectedSessionIds.includes(
                      session.id
                    );
                    const activeForQR = selectedSessionId === session.id;
                    const expired = isSessionExpired(session);

                    return (
                      <div
                        key={session.id}
                        className={`rounded-xl border p-4 shadow-sm transition ${
                          darkMode ? "bg-gray-800" : "bg-white"
                        } ${
                          activeForQR
                            ? darkMode
                              ? "border-pink-500 ring-2 ring-pink-500/20"
                              : "border-pink-500 ring-2 ring-pink-100"
                            : selectedForDelete
                            ? darkMode
                              ? "border-red-500/40 bg-red-500/5"
                              : "border-red-300 bg-red-50/40"
                            : darkMode
                            ? "border-gray-700 hover:border-pink-500/50 hover:bg-gray-800/60"
                            : "border-pink-100 hover:border-pink-300 hover:bg-pink-50/40"
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSessionSelection(session.id)}
                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
                              selectedForDelete
                                ? "border-red-500 bg-red-500 text-white"
                                : darkMode
                                ? "border-gray-600 bg-gray-800 text-gray-500 hover:border-red-400 hover:text-red-400"
                                : "border-pink-300 bg-white text-gray-300 hover:border-red-400 hover:text-red-400"
                            }`}
                            title="Select for delete"
                          >
                            {selectedForDelete ? (
                              <Check size={15} strokeWidth={3} />
                            ) : (
                              <span className={`h-2.5 w-2.5 rounded-sm border ${darkMode ? "border-gray-600 bg-gray-700" : "border-pink-300 bg-pink-50"}`} />
                            )}
                          </button>

                          <SessionBadge
                            status={session.status}
                            expired={expired}
                            darkMode={darkMode}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleViewSession(session.id)}
                          className="w-full text-left"
                        >
                          <p className={`line-clamp-2 text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {session.title}
                          </p>

                          <p className={`mt-2 text-xs ${darkMode ? "text-gray-400" : "text-black"}`}>
                            {formatEventDate(session.eventDate)} at{" "}
                            {formatTime(session.eventTime)}
                          </p>

                          <p className={`mt-1 text-xs ${darkMode ? "text-red-400" : "text-red-500"}`}>
                            QR ends at {formatTime(session.qrEndTime)}
                          </p>

                          <div className={`mt-4 flex items-center gap-2 text-xs font-medium ${darkMode ? "text-pink-400" : "text-pink-700"}`}>
                            <QrCode size={14} />
                            View generated QR
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${darkMode ? "bg-pink-500/10" : "bg-pink-50"}`}>
                    <QrCode size={22} className={darkMode ? "text-pink-500/50" : "text-pink-300"} />
                  </div>
                  <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    No sessions created yet
                  </p>
                  <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                    Create a session first to generate QR codes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showQRModal && selectedSession && qrValue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className={`relative rounded-2xl p-8 shadow-2xl max-w-sm w-full ${
              darkMode ? "bg-gray-900 border border-gray-700" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQRModal(false)}
              className={`absolute right-4 top-4 transition ${
                darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center gap-4">
              <div className={`rounded-xl border p-4 ${darkMode ? "border-gray-700" : "border-pink-100"}`}>
                <QRCodeCanvas
                  value={qrValue}
                  size={260}
                  fgColor="#9d174d"
                  bgColor="#ffffff"
                  level="M"
                />
              </div>

              <div className="text-center">
                <p className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  {selectedSession.title}
                </p>
                <p className={`text-sm mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {formatEventDate(selectedSession.eventDate)} at{" "}
                  {formatTime(selectedSession.eventTime)}
                </p>
                <p className={`text-xs mt-0.5 ${darkMode ? "text-red-400" : "text-red-500"}`}>
                  QR ends at {formatTime(selectedSession.qrEndTime)}
                </p>
              </div>

              <SessionBadge
                status={selectedSession.status}
                expired={selectedSessionExpired}
                darkMode={darkMode}
              />

              <button
                onClick={handleDownloadQR}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pink-700 transition"
              >
                <Download size={16} /> Download QR as PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}