import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function ScanAttendancePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSession();
  }, []);

  const getLoggedInUser = () => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      if (userData) {
        const uid =
          userData.uid ||
          userData.id ||
          sessionStorage.getItem("uid") ||
          null;

        if (uid) return { ...userData, uid };
      }
    } catch {
      // ignore parse errors, fall through
    }
    return null;
  };

  const loadSession = async () => {
    try {
      if (!sessionId) {
        setMessage("Invalid QR Code.");
        setLoading(false);
        return;
      }

      const sessionRef = doc(db, "sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        setMessage("Attendance session not found.");
        setLoading(false);
        return;
      }

      const sessionData = {
        id: sessionSnap.id,
        ...sessionSnap.data(),
      };

      if (sessionData.status !== "active") {
        setMessage("This attendance session has ended.");
        setLoading(false);
        return;
      }

      const endDateTime = new Date(
        `${sessionData.eventDate}T${sessionData.qrEndTime}`
      );

      if (new Date() > endDateTime) {
        setMessage("QR Code has already expired.");
        setLoading(false);
        return;
      }

      setSession(sessionData);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load session.");
    }

    setLoading(false);
  };

  const handleConfirmAttendance = async () => {
    try {
      setSaving(true);

      const user = getLoggedInUser();

      if (!user) {
        alert("Please login first.");
        setSaving(false);
        return;
      }

      // Deterministic, per-officer, per-session doc id (sessionId_uid).
      // Guarantees this officer only ever touches THEIR OWN attendance
      // record for THIS session — no shared query, no chance that a
      // different officer scanning on another device at the same time
      // ends up updating this record (or vice versa). The transaction
      // makes the check-then-write atomic.
      const attendanceDocId = `${sessionId}_${user.uid}`;
      const attendanceRef = doc(db, "attendance", attendanceDocId);

      const result = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(attendanceRef);

        if (!snap.exists()) {
          transaction.set(attendanceRef, {
            sessionId,
            userId: user.uid,
            studentId: user.studentId || "",
            studentName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User",
            position: user.position || "SSC Officer",
            role: user.role || null,
            timeIn: serverTimestamp(),
            timeOut: null,
            createdAt: serverTimestamp(),
          });
          return { type: "timein" };
        }

        const data = snap.data();

        // Ownership guard: don't rely on uid alone. If two different
        // officers ever resolve to the same uid upstream (stale/shared
        // session data, login bug, etc.), the deterministic doc id would
        // collide and this uid-only check would silently pass, letting
        // one officer's scan mutate another officer's record. Cross-check
        // against studentId too — it's effectively impossible for two
        // different officers to share both.
        const sameOwner =
          data.userId === user.uid &&
          (!user.studentId || data.studentId === user.studentId);

        if (!sameOwner) {
          return { type: "mismatch" };
        }

        if (data.timeOut) {
          return { type: "already" };
        }

        transaction.update(attendanceRef, {
          timeOut: serverTimestamp(),
        });
        return { type: "timeout" };
      });

      if (result.type === "mismatch") {
        alert("Attendance record mismatch. Please try again.");
        setSaving(false);
        return;
      }

      if (result.type === "already") {
        alert("Attendance already recorded.");
        setSaving(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to record attendance.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading session...
      </div>
    );
  }

  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <h2 className="font-bold text-lg mb-2">
            Attendance Unavailable
          </h2>
          <p>{message}</p>

          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <h2 className="text-green-600 font-bold text-xl">
            Attendance Recorded
          </h2>

          <p className="mt-2">
            Your attendance has been successfully recorded.
          </p>

          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        <h1 className="text-xl font-bold text-center text-pink-700">
          Attendance Confirmation
        </h1>

        <div className="mt-5 space-y-3">
          <div>
            <p className="text-xs text-gray-500">Session</p>
            <p className="font-semibold">{session.title}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Event Date</p>
            <p>{session.eventDate}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Event Time</p>
            <p>{session.eventTime}</p>
          </div>
        </div>

        <button
          onClick={handleConfirmAttendance}
          disabled={saving}
          className="w-full mt-6 bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-xl font-semibold"
        >
          {saving ? "Recording..." : "Confirm Attendance"}
        </button>
      </div>
    </div>
  );
}