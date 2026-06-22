import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";

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

      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Please login first.");
        return;
      }

      // duplicate check
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("sessionId", "==", sessionId),
        where("studentId", "==", currentUser.uid)
      );

      const existing = await getDocs(attendanceQuery);

      if (!existing.empty) {
        alert("Attendance already recorded.");
        return;
      }

      await addDoc(collection(db, "attendance"), {
        sessionId,
        studentId: currentUser.uid,
        studentName: currentUser.displayName || "Unknown User",
        position: "SSC Officer",
        timeIn: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

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