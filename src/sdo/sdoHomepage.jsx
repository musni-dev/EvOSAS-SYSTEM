import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import SDOLayout from "./SDOLayout";
import CaseRecords from "../AdminDashboard/Disciplinary/CaseRecords";
import LostFoundPage from "../AdminDashboard/pages/LostFoundPage";

export default function SDOHomepage() {
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
    approved: cases.filter((c) => c.status === "Approved").length,
    declined: cases.filter((c) => c.status === "Declined").length,
    lost: lostItems.filter((i) => i.reportType === "Lost").length,
    found: lostItems.filter((i) => i.reportType === "Found").length,
  };

  const today = new Date().toLocaleDateString("en-US", {
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
        <div>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-medium text-gray-900">Student Disciplinary Officer</h1>
              <p className="text-sm text-gray-500">All active records at a glance</p>
            </div>
            <span className="text-xs text-pink-500 bg-white  px-3 py-1 rounded-lg">
              {today}
            </span>
          </div>

          {/* CASE STATS */}
          <div className="grid grid-cols-2 borde sm:grid-cols-4 gap-3 mb-6">
            <Stat label="Total cases" value={stats.totalCases} />
            <Stat label="Pending" value={stats.pending} />
            <Stat label="Approved" value={stats.approved} />
            <Stat label="Declined" value={stats.declined} />
          </div>

          {/* LOST FOUND */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatBox label="Lost items" value={stats.lost} />
            <StatBox label="Found items" value={stats.found} />
          </div>

          {/* QUICK ACCESS */}
          <div className="bg-white border rounded-xl p-5">
            <button onClick={() => setActivePage("cases")} className="mr-3 px-4 py-2 bg-black text-white rounded">
              Open Cases
            </button>
            <button onClick={() => setActivePage("lostfound")} className="px-4 py-2 border rounded">
              Lost & Found
            </button>
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
    </SDOLayout>
  );
}

/* small UI helpers */
function Stat({ label, value }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-medium">{value}</p>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-medium">{value}</p>
    </div>
  );
}