import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, onSnapshot, doc } from "firebase/firestore"; // NEW: doc
import { QrCode, Clock } from "lucide-react";

import SDOLayout from "./SDOLayout";
import CaseRecords from "../AdminDashboard/Disciplinary/CaseRecords";
import LostFoundPage from "../AdminDashboard/pages/LostFoundPage";
import SDOProfile from "./SDOProfile";
// Reuse the exact same attendance components used by the SSC homepage
// (adjust the path/filename to where your SSC homepage file lives)
import { ScanView, ConfirmView, RecordsModal } from "../ssc/sscHomepage";

// NEW: reads the logged-in user's uid from the session
function getSessionUid() {
  try {
    const stored = JSON.parse(sessionStorage.getItem("userData") || "{}");
    return sessionStorage.getItem("uid") || stored.uid || "";
  } catch {
    return sessionStorage.getItem("uid") || "";
  }
}

export default function sdoHomepage() {
  const [activePage, setActivePage] = useState("dashboard");
  const [cases, setCases] = useState([]);
  const [lostItems, setLostItems] = useState([]);

  // NEW: force-change-password state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [securityChecked, setSecurityChecked] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cases"), (snap) => {
      setCases(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "lost_found"), (snap) => {
      setLostItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // NEW: live-watch the user's own document for the mustChangePassword flag.
  // If the admin resets the password while the user is online, they get locked too.
  useEffect(() => {
    const uid = getSessionUid();
    if (!uid) {
      setSecurityChecked(true);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setMustChangePassword(snap.exists() && snap.data().mustChangePassword === true);
        setSecurityChecked(true);
      },
      () => {
        setSecurityChecked(true);
      }
    );
    return () => unsub();
  }, []);

  // NEW: while the password change is required, only the Profile page is allowed.
  useEffect(() => {
    if (mustChangePassword && activePage !== "profile") {
      setActivePage("profile");
    }
  }, [mustChangePassword, activePage]);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear()
    window.location.href = "/";
  };

  const stats = {
    totalCases: cases.length,
    pending: cases.filter((c) => c.status === "in-progress").length,
    declined: cases.filter((c) => c.status === "Declined").length,
    lost: lostItems.filter((i) => i.reportType === "Lost").length,
    found: lostItems.filter((i) => i.reportType === "Found").length,
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // NEW: don't show any feature until we know if a password change is required
  if (!securityChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <SDOLayout
      activePage={activePage}
      setActivePage={setActivePage}
      handleLogout={handleLogout}
      forcePasswordChange={mustChangePassword} // NEW
    >
      {/* ================= DASHBOARD ================= */}
      {activePage === "dashboard" && (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          {/* HERO / WELCOME BAR */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600 to-pink-700 p-6 sm:p-8 mb-6 shadow-lg shadow-pink-600/20">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
            <div className="absolute -right-4 -bottom-16 w-40 h-40 rounded-full bg-white/10" />
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-pink-100 text-xs font-medium uppercase tracking-wider mb-1">
                  {today}
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold text-white">
                  Student Disciplinary Officer
                </h1>
                <p className="text-sm text-pink-100 mt-1">
                  All active records at a glance
                </p>
              </div>
            </div>
          </div>

          {/* CASE STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard
              label="Total cases"
              value={stats.totalCases}
              accent="pink"
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
            <StatCard
              label="On-going cases"
              value={stats.pending}
              accent="amber"
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <StatCard
              label="Lost items"
              value={stats.lost}
              accent="blue"
              icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
            <StatCard
              label="Found items"
              value={stats.found}
              accent="green"
              icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </div>

          {/* QUICK ACCESS */}
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Quick access
            </h3>
            <p className="text-xs text-gray-500 dark:text-neutral-500 mb-4">
              Jump straight into your most common tasks
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setActivePage("cases")}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-pink-600 text-white text-sm font-medium
                  hover:bg-pink-700 active:scale-[0.98] transition-all duration-150 shadow-sm shadow-pink-600/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Open cases
              </button>

              <button
                onClick={() => setActivePage("lostfound")}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 dark:border-neutral-700
                  text-gray-700 dark:text-neutral-300 text-sm font-medium bg-white dark:bg-neutral-800
                  hover:bg-gray-50 dark:hover:bg-neutral-700 active:scale-[0.98] transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Lost &amp; found
              </button>

              <button
                onClick={() => setActivePage("attendance")}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 dark:border-neutral-700
                  text-gray-700 dark:text-neutral-300 text-sm font-medium bg-white dark:bg-neutral-800
                  hover:bg-gray-50 dark:hover:bg-neutral-700 active:scale-[0.98] transition-all duration-150"
              >
                <QrCode className="w-4 h-4" />
                Scan attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CASES ================= */}
      {activePage === "cases" && (
        <CaseRecords cases={cases} setActivePage={setActivePage} isSDO={true} />
      )}

      {/* ================= LOST & FOUND ================= */}
      {activePage === "lostfound" && (
        <LostFoundPage setActivePage={setActivePage} isSDO={true} />
      )}

      {/* ================= SCAN ATTENDANCE ================= */}
      {activePage === "attendance" && (
        <AttendanceFlow goToDashboard={() => setActivePage("dashboard")} />
      )}

      {/* ================= PROFILE ================= */}
      {activePage === "profile" && <SDOProfile forcePasswordChange={mustChangePassword} />}
    </SDOLayout>
  );
}

/* ---------------- attendance flow ---------------- */
/* Same flow as the SSC homepage: home -> scan -> confirm.
   Uses the exact same ScanView / ConfirmView / RecordsModal, so the
   attendance logic (sessions check, QR expiry, transaction time in/out)
   is untouched. */

function AttendanceFlow({ goToDashboard }) {
  const [view, setView] = useState("home"); // "home" | "scan" | "confirm"
  const [scanResult, setScanResult] = useState(null);
  const [showRecords, setShowRecords] = useState(false);

  return (
    <div className="h-full w-full overflow-y-auto relative">
      {view === "home" && (
        <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-br from-pink-50 via-white to-pink-100">
          <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center">
            <div className="mb-8 text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Scan Attendance
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Time in or time out for events
              </p>
            </div>

            <button
              onClick={() => setView("scan")}
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

            <button
              onClick={() => setShowRecords(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-pink-200 bg-white
                         text-pink-600 text-sm font-semibold hover:bg-pink-50 active:bg-pink-100 transition"
            >
              <Clock className="w-4 h-4" />
              View Records
            </button>
          </div>

          <RecordsModal
            isOpen={showRecords}
            onClose={() => setShowRecords(false)}
            darkMode={false}
          />

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

/* ---------------- helpers ---------------- */

const accentStyles = {
  pink: {
    icon: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-950/40",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  blue: {
    icon: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  green: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
};

function StatCard({ label, value, icon, accent = "pink" }) {
  const styles = accentStyles[accent];
  return (
    <div
      className="group bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5
        shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${styles.bg}`}>
          <svg className={`w-[18px] h-[18px] ${styles.icon}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 dark:text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}