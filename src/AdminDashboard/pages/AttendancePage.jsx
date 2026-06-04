import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { Download, Plus, QrCode, Users } from "lucide-react";
import { db } from "../../firebase/firebase";;

export default function AttendancePage() {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  const qrValue = selectedSession
    ? `${window.location.origin}/scan-attendance?sessionId=${selectedSession.id}`
    : "";

  useEffect(() => {
    const sessionsQuery = query(
      collection(db, "sessions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSessions(data);

      if (!selectedSessionId && data.length > 0) {
        setSelectedSessionId(data[0].id);
      }
    });

    return unsubscribe;
  }, [selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setRecords([]);
      return;
    }

    const recordsQuery = query(
      collection(db, "attendance"),
      where("sessionId", "==", selectedSessionId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(recordsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRecords(data);
    });

    return unsubscribe;
  }, [selectedSessionId]);

  async function handleCreateSession(e) {
    e.preventDefault();

    if (!title.trim() || !eventDate) return;

    setLoading(true);

    try {
      const sessionRef = await addDoc(collection(db, "sessions"), {
        title: title.trim(),
        eventDate,
        status: "active",
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setEventDate("");
      setSelectedSessionId(sessionRef.id);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(value) {
    if (!value) return "-";

    if (value.toDate) {
      return value.toDate().toLocaleString();
    }

    return String(value);
  }

  function exportCSV() {
    const headers = [
      "Student ID",
      "Student Name",
      "Course",
      "Year Level",
      "Session",
      "Timestamp",
    ];

    const rows = records.map((record) => [
      record.studentId || "",
      record.studentName || "",
      record.course || "",
      record.yearLevel || "",
      selectedSession?.title || "",
      formatDate(record.timestamp),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${selectedSession?.title || "attendance"}-records.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-pink-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-pink-700">
              SSC Attendance System
            </h1>
            <p className="text-sm text-pink-900/70">
              Generate QR attendance sessions and monitor student records.
            </p>
          </div>

          <div className="rounded-md bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-semibold text-pink-700">{records.length}</span>{" "}
            attendance records
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <form
              onSubmit={handleCreateSession}
              className="rounded-lg bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2 text-pink-700">
                <Plus size={20} />
                <h2 className="font-semibold">Create Attendance Session</h2>
              </div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Session Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example: SSC General Assembly"
                className="mb-4 w-full rounded-md border border-pink-200 px-3 py-2 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mb-4 w-full rounded-md border border-pink-200 px-3 py-2 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              />

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-pink-600 px-4 py-2 font-medium text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <QrCode size={18} />
                {loading ? "Creating..." : "Generate QR Code"}
              </button>
            </form>

            <div className="rounded-lg bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-pink-700">
                <QrCode size={20} />
                <h2 className="font-semibold">QR Code</h2>
              </div>

              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="mb-5 w-full rounded-md border border-pink-200 px-3 py-2 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
              >
                <option value="">Select session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>

              {selectedSession ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-lg border border-pink-100 bg-white p-4">
                    <QRCodeCanvas value={qrValue} size={220} />
                  </div>

                  <div className="text-center">
                    <p className="font-semibold text-gray-900">
                      {selectedSession.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedSession.eventDate}
                    </p>
                  </div>

                  <input
                    readOnly
                    value={qrValue}
                    className="w-full rounded-md border border-pink-100 bg-pink-50 px-3 py-2 text-xs text-gray-600"
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Create or select a session to generate QR code.
                </p>
              )}
            </div>
          </div>

          <section className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-pink-700">
                <Users size={20} />
                <h2 className="font-semibold">Attendance Records</h2>
              </div>

              <button
                onClick={exportCSV}
                disabled={!records.length}
                className="flex items-center justify-center gap-2 rounded-md border border-pink-200 px-4 py-2 text-sm font-medium text-pink-700 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-pink-100/70 text-pink-900">
                    <th className="px-4 py-3 font-semibold">Student ID</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Course</th>
                    <th className="px-4 py-3 font-semibold">Year</th>
                    <th className="px-4 py-3 font-semibold">Time In</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-pink-50">
                      <td className="px-4 py-3">{record.studentId || "-"}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {record.studentName || "-"}
                      </td>
                      <td className="px-4 py-3">{record.course || "-"}</td>
                      <td className="px-4 py-3">{record.yearLevel || "-"}</td>
                      <td className="px-4 py-3">
                        {formatDate(record.timestamp)}
                      </td>
                    </tr>
                  ))}

                  {!records.length && (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-4 py-10 text-center text-gray-500"
                      >
                        No attendance records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}