import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ScanLine,
  Camera,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Home,
  QrCode,
} from "lucide-react";
import { db, auth } from "../firebase/firebase"; // adjust path to your firebase config

/**
 * SscHomepage
 * Single-file SSC Officer experience:
 *  - "home"    : dashboard with a "Scan Attendance" button
 *  - "scan"    : opens device camera, decodes the event QR code (jsQR)
 *  - "confirm" : writes/updates the Firestore "attendance" doc, shows result
 *
 * Expected QR payload (JSON string encoded in the QR):
 * { "eventId": "EVT-2026-001", "eventName": "General Assembly", "type": "timeIn" | "timeOut" }
 *
 * Firestore collection: "attendance"
 * Doc shape: { officerId, eventId, eventName, date, timeIn, timeOut, isDeleted, createdAt }
 */
export default function sscHomepage() {
  const [view, setView] = useState("home"); // "home" | "scan" | "confirm"
  const [scanResult, setScanResult] = useState(null); // decoded payload passed to confirm view

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-pink-100">
      {view === "home" && (
        <HomeView
          onScanPress={() => setView("scan")}
        />
      )}

      {view === "scan" && (
        <ScanView
          onBack={() => setView("home")}
          onDecoded={(payload) => {
            setScanResult(payload);
            setView("confirm");
          }}
        />
      )}

      {view === "confirm" && scanResult && (
        <ConfirmView
          payload={scanResult}
          onScanAgain={() => {
            setScanResult(null);
            setView("scan");
          }}
          onDone={() => {
            setScanResult(null);
            setView("home");
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* HOME VIEW                                                               */
/* ---------------------------------------------------------------------- */

function HomeView({ onScanPress }) {
  const officerName = auth.currentUser?.displayName || "Officer";

  return (
    <div className="min-h-screen w-full flex flex-col px-4 py-6 sm:py-10">
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex-1 flex flex-col">
        {/* Greeting */}
        <div className="mb-8 sm:mb-12 text-center">
          <p className="text-sm text-gray-500">Welcome back,</p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{officerName}</h1>
        </div>

        {/* Scan card */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <button
            onClick={onScanPress}
            className="group relative w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-pink-600
                       hover:bg-pink-700 active:bg-pink-800 shadow-xl shadow-pink-300/50
                       flex flex-col items-center justify-center gap-3 transition
                       focus:outline-none focus:ring-4 focus:ring-pink-300"
          >
            <span className="absolute inset-0 rounded-full bg-pink-400/40 animate-ping-slow" />
            <QrCode className="relative w-12 h-12 sm:w-14 sm:h-14 text-white" />
            <span className="relative text-white font-semibold text-sm sm:text-base">
              Scan Attendance
            </span>
          </button>
          <p className="text-gray-500 text-xs sm:text-sm mt-6 text-center max-w-[260px]">
            Tap the button and point your camera at the event QR code to time in or time out.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.5; }
          80% { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 2.4s cubic-bezier(0,0,0.2,1) infinite;
        }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* SCAN VIEW (camera + jsQR)                                               */
/* ---------------------------------------------------------------------- */

function ScanView({ onBack, onDecoded }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const [permissionState, setPermissionState] = useState("requesting"); // requesting | granted | denied
  const [scanError, setScanError] = useState("");
  const [scanning, setScanning] = useState(true);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleDecodedRaw = useCallback(
    (raw) => {
      setScanning(false);
      stopCamera();

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        setScanError("This QR code isn't a valid attendance code.");
        setScanning(true);
        return;
      }

      if (!payload.eventId || !payload.type) {
        setScanError("This QR code is missing required attendance info.");
        setScanning(true);
        return;
      }

      onDecoded({
        eventId: payload.eventId,
        eventName: payload.eventName || "Unnamed Event",
        type: payload.type, // "timeIn" or "timeOut"
      });
    },
    [onDecoded, stopCamera]
  );

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        handleDecodedRaw(code.data);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [handleDecodedRaw]);

  const startCamera = useCallback(async () => {
    setScanError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermissionState("granted");
      setScanning(true);
    } catch (err) {
      console.error(err);
      setPermissionState("denied");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (permissionState === "granted" && scanning) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick, permissionState, scanning]);

  return (
    <div className="min-h-screen w-full bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 sm:py-4 z-10">
        <button
          onClick={() => {
            stopCamera();
            onBack();
          }}
          className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-white font-semibold text-base sm:text-lg">Scan Attendance QR</h1>
          <p className="text-gray-400 text-xs sm:text-sm">Point your camera at the event QR code</p>
        </div>
      </div>

      {/* Camera viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {permissionState === "denied" ? (
          <div className="text-center px-6 max-w-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mb-4">
              <Camera className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">Camera access needed</h2>
            <p className="text-gray-400 text-sm mb-5">
              Please allow camera permission in your browser settings to scan the
              attendance QR code.
            </p>
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600
                         hover:bg-pink-700 text-white text-sm font-semibold transition"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan frame overlay */}
            <div className="relative z-10 w-[70vw] max-w-[280px] aspect-square">
              <div className="absolute inset-0 rounded-2xl border-2 border-pink-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-pink-400 rounded-tl-2xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-pink-400 rounded-tr-2xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-pink-400 rounded-bl-2xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-pink-400 rounded-br-2xl" />
              {scanning && (
                <div className="absolute left-0 right-0 h-0.5 bg-pink-400 shadow-[0_0_8px_2px_rgba(236,72,153,0.7)] animate-scan-line" />
              )}
            </div>

            {permissionState === "requesting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                <div className="flex items-center gap-2 text-white text-sm">
                  <ScanLine className="w-5 h-5 animate-pulse" />
                  Requesting camera access...
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error toast */}
      {scanError && (
        <div className="absolute bottom-6 left-4 right-4 sm:max-w-md sm:mx-auto sm:left-0 sm:right-0">
          <div className="flex items-start gap-2 bg-red-500/95 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{scanError}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan-line {
          0% { top: 6%; }
          50% { top: 92%; }
          100% { top: 6%; }
        }
        .animate-scan-line {
          animation: scan-line 2.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* CONFIRM VIEW (Firestore write + result)                                 */
/* ---------------------------------------------------------------------- */

function ConfirmView({ payload, onScanAgain, onDone }) {
  const [status, setStatus] = useState("processing"); // processing | success | error | already
  const [message, setMessage] = useState("");
  const [record, setRecord] = useState(null);

  useEffect(() => {
    recordAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordAttendance = async () => {
    const { eventId, eventName, type } = payload;
    const officerId = auth.currentUser?.uid;
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (!officerId) {
      setStatus("error");
      setMessage("You're not signed in. Please log in again.");
      return;
    }

    try {
      const attendanceRef = collection(db, "attendance");
      const q = query(
        attendanceRef,
        where("officerId", "==", officerId),
        where("eventId", "==", eventId),
        where("date", "==", todayStr)
      );
      const existingSnap = await getDocs(q);

      if (type === "timeIn") {
        if (!existingSnap.empty) {
          const existing = existingSnap.docs[0].data();
          setStatus("already");
          setMessage("You've already timed in for this event today.");
          setRecord({ ...existing, eventName });
          return;
        }

        const newDoc = {
          officerId,
          eventId,
          eventName,
          date: todayStr,
          timeIn: serverTimestamp(),
          timeOut: null,
          isDeleted: false,
          createdAt: serverTimestamp(),
        };
        await addDoc(attendanceRef, newDoc);

        setStatus("success");
        setMessage("Time-in recorded successfully.");
        setRecord({ ...newDoc, timeIn: Timestamp.now() });
      } else if (type === "timeOut") {
        if (existingSnap.empty) {
          setStatus("error");
          setMessage("No time-in record found for this event today. Please time in first.");
          return;
        }

        const existingDocSnap = existingSnap.docs[0];
        const existingData = existingDocSnap.data();

        if (existingData.timeOut) {
          setStatus("already");
          setMessage("You've already timed out for this event today.");
          setRecord({ ...existingData, eventName });
          return;
        }

        await updateDoc(doc(db, "attendance", existingDocSnap.id), {
          timeOut: serverTimestamp(),
        });

        setStatus("success");
        setMessage("Time-out recorded successfully.");
        setRecord({ ...existingData, eventName, timeOut: Timestamp.now() });
      } else {
        setStatus("error");
        setMessage("Unrecognized scan type.");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Something went wrong while recording your attendance. Please try again.");
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "—";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = () =>
    new Date().toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const renderIcon = () => {
    if (status === "processing")
      return (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-pink-100 flex items-center justify-center">
          <ScanLine className="w-9 h-9 sm:w-11 sm:h-11 text-pink-500 animate-pulse" />
        </div>
      );
    if (status === "success")
      return (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 text-green-600" />
        </div>
      );
    if (status === "already")
      return (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-100 flex items-center justify-center">
          <Clock className="w-9 h-9 sm:w-11 sm:h-11 text-amber-600" />
        </div>
      );
    return (
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle className="w-9 h-9 sm:w-11 sm:h-11 text-red-600" />
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-xl shadow-pink-100/60 border border-pink-100 p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-4">{renderIcon()}</div>

        <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
          {status === "processing" && "Recording attendance..."}
          {status === "success" && "Attendance Confirmed"}
          {status === "already" && "Already Recorded"}
          {status === "error" && "Attendance Failed"}
        </h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>

        {record && status !== "processing" && (
          <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 mb-6 text-left space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Calendar className="w-4 h-4 text-pink-500 flex-shrink-0" />
              <span className="font-medium">{record.eventName}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{formatDate()}</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1 border-t border-pink-100">
              <span className="text-gray-500">Time In</span>
              <span className="font-semibold text-gray-800">{formatTime(record.timeIn)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Time Out</span>
              <span className="font-semibold text-gray-800">{formatTime(record.timeOut)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {status === "error" && (
            <button
              onClick={onScanAgain}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl
                         bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white font-semibold
                         text-sm sm:text-base shadow-md shadow-pink-200 transition"
            >
              <ScanLine className="w-4 h-4" />
              Scan Again
            </button>
          )}
          <button
            onClick={onDone}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl
                       font-semibold text-sm sm:text-base transition
                       ${
                         status === "error"
                           ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                           : "bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white shadow-md shadow-pink-200"
                       }`}
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}