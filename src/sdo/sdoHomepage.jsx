import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import SDOLayout from "./SDOLayout";
import CaseRecords from "../AdminDashboard/Disciplinary/CaseRecords";
import LostFoundPage from "../AdminDashboard/pages/LostFoundPage";
import SDOProfile from "./SDOProfile";

export default function sdoHomepage() {
  const [activePage, setActivePage] = useState("dashboard");
  const [cases, setCases] = useState([]);
  const [lostItems, setLostItems] = useState([]);

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

  const handleLogout = () => {
    localStorage.clear();
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

  return (
    <SDOLayout
      activePage={activePage}
      setActivePage={setActivePage}
      handleLogout={handleLogout}
    >
      {/* ================= DASHBOARD ================= */}
      {activePage === "dashboard" && (
        <div className="max-w-6xl mx-auto">
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

      {/* ================= PROFILE ================= */}
      {activePage === "profile" && <SDOProfile />}
    </SDOLayout>
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