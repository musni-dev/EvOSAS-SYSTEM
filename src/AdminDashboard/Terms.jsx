import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ShieldCheck, FileText, Lock, Eye } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    localStorage.setItem("acceptedTerms", "true");
    navigate("/admin/adminhome");
  };

  const handleClose = () => {
    navigate("/");
  };

  const termPoints = [
    {
      icon: ShieldCheck,
      text: "By accessing and using the EvOSAS Management System, you agree to comply with all institutional policies and data privacy regulations implemented by the school administration.",
    },
    {
      icon: Lock,
      text: "All disciplinary records, student information, reports, and confidential files stored within the system must only be accessed by authorized personnel.",
    },
    {
      icon: FileText,
      text: "Administrators are responsible for maintaining the accuracy, confidentiality, and integrity of all submitted records and reports.",
    },
    {
      icon: ShieldCheck,
      text: "Unauthorized sharing, exporting, tampering, or misuse of confidential information may result in disciplinary action and suspension of system access privileges.",
    },
    {
      icon: Eye,
      text: "The system logs user activities for monitoring and security purposes to ensure accountability within the administration.",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f4f4f5]">
      {/* ===== Fake Dashboard Background ===== */}
      <div className="absolute inset-0 flex">
        {/* Sidebar */}
        <div className="w-64 bg-[#171018] hidden lg:flex flex-col">
          <div className="p-6 text-xl font-extrabold text-white border-b border-white/10 tracking-tight">
            EvOSAS Admin
          </div>

          <div className="flex flex-col gap-2 p-5">
            <div className="bg-gradient-to-r from-[#ff6699] to-[#ff77aa] text-white font-semibold px-4 py-3 rounded-xl text-sm">
              Dashboard
            </div>
            <div className="text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl transition text-sm font-medium">
              Student Cases
            </div>
            <div className="text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl transition text-sm font-medium">
              Reports
            </div>
            <div className="text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl transition text-sm font-medium">
              Violations
            </div>
            <div className="text-white/70 hover:bg-white/10 hover:text-white px-4 py-3 rounded-xl transition text-sm font-medium">
              Accounts
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 hidden md:block">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 h-40">
              <h2 className="text-[#1a1a1a]/60 text-sm font-semibold">Total Students</h2>
              <p className="text-4xl font-extrabold text-[#1a1a1a] mt-4">1,250</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 h-40">
              <h2 className="text-[#1a1a1a]/60 text-sm font-semibold">Active Cases</h2>
              <p className="text-4xl font-extrabold text-[#ff6699] mt-4">32</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 h-40">
              <h2 className="text-[#1a1a1a]/60 text-sm font-semibold">Resolved Reports</h2>
              <p className="text-4xl font-extrabold text-[#1a1a1a] mt-4">210</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Blur Overlay + Modal ===== */}
      <div className="absolute inset-0 bg-[#171018]/70 backdrop-blur-md flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-5 bg-gradient-to-r from-[#ff6699] to-[#ff77aa] shrink-0">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-10 w-10 rounded-xl bg-white/20 items-center justify-center shrink-0">
                <ShieldCheck className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-extrabold text-white leading-tight">
                  Data Privacy &amp; Terms
                </h1>
                <p className="text-white/90 text-xs sm:text-sm font-medium">
                  OSAS Management System
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              aria-label="Close"
              className="text-white hover:bg-white/20 p-2 rounded-full transition shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1a1a1a]">
                Terms and Conditions
              </h2>
              <p className="text-[#1a1a1a]/70 text-sm font-medium mt-1">
                Please read carefully before accessing the admin dashboard.
              </p>
            </div>

            <div className="space-y-3">
              {termPoints.map(({ icon: Icon, text }, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl bg-[#fafafa] border border-black/5 p-4"
                >
                  <div className="h-8 w-8 rounded-lg bg-[#fff1f6] flex items-center justify-center shrink-0">
                    <Icon className="text-[#ff6699]" size={15} />
                  </div>
                  <p className="text-sm text-[#1a1a1a]/85 leading-relaxed">{text}</p>
                </div>
              ))}

              <div className="rounded-2xl bg-[#fff1f6] border border-[#ff6699]/20 p-4">
                <p className="text-sm text-[#1a1a1a]/85 leading-relaxed">
                  By clicking{" "}
                  <span className="font-bold text-[#ff6699]">Accept</span>, you
                  confirm that you fully understand and agree to these terms,
                  conditions, and privacy policies.
                </p>
              </div>
            </div>
          </div>

          {/* Sticky footer: checkbox + button (always reachable, even on short screens) */}
          <div className="shrink-0 border-t border-black/5 px-6 sm:px-8 py-5 space-y-4 bg-white">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded accent-[#ff6699] cursor-pointer shrink-0"
              />
              <span className="text-sm font-medium text-[#1a1a1a]/85">
                I have read and agreed to the Terms and Conditions and Data
                Privacy Policy.
              </span>
            </label>

            <button
              onClick={handleAccept}
              disabled={!checked}
              className={`w-full sm:w-auto sm:mx-auto sm:block font-bold px-10 py-3.5 rounded-xl shadow-lg transition-all duration-200
              ${
                checked
                  ? "bg-gradient-to-r from-[#ff6699] to-[#ff77aa] text-white shadow-[#ff6699]/35 hover:shadow-xl hover:-translate-y-0.5"
                  : "bg-[#1a1a1a]/10 text-[#1a1a1a]/40 cursor-not-allowed shadow-none"
              }`}
            >
              Accept &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}