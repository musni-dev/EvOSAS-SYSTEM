import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";

/*
  This account (SDO) does NOT log in through Firebase Auth — per Login.jsx,
  only Administrator uses signInWithEmailAndPassword. SSC Officer / SDO / SOC
  accounts log in through the Firestore "users" collection + bcrypt password
  check, and the session is kept in localStorage ("uid", "role", "userData").

  So this page reads the logged-in user the same way UsersPage.jsx's
  getCurrentUser() does, and changes the password by bcrypt-comparing /
  re-hashing directly against the Firestore "users/{uid}" document — not
  Firebase Auth's updatePassword/reauthenticateWithCredential.
*/

function getSessionUser() {
  try {
    const stored = JSON.parse(localStorage.getItem("userData") || "{}");
    return {
      uid: localStorage.getItem("uid") || stored.uid || "",
      role: localStorage.getItem("role") || stored.role || "",
      ...stored,
    };
  } catch {
    return {
      uid: localStorage.getItem("uid") || "",
      role: localStorage.getItem("role") || "",
    };
  }
}

function getInitials(name) {
  if (!name) return "SD";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = value?.toDate ? value.toDate() : new Date(value);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatName(profile) {
  return (
    [profile?.firstName, profile?.middleName, profile?.lastName, profile?.suffix]
      .filter(Boolean)
      .join(" ") ||
    profile?.username ||
    "SDO Account"
  );
}

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
}

const strengthMeta = [
  { label: "Very weak", color: "bg-red-500" },
  { label: "Weak", color: "bg-red-500" },
  { label: "Fair", color: "bg-amber-500" },
  { label: "Good", color: "bg-amber-500" },
  { label: "Strong", color: "bg-emerald-500" },
  { label: "Very strong", color: "bg-emerald-500" },
];

export default function SDOProfile({ darkMode }) {
  const [uid, setUid] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwStatus, setPwStatus] = useState({ type: "", message: "" }); // type: "success" | "error"
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const session = getSessionUser();
      setUid(session.uid);

      if (!session.uid) {
        setProfile({});
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", session.uid));
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : session);
      } catch {
        setProfile(session);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const displayName = formatName(profile);
  const photoURL = profile?.photoURL || null;

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwStatus({ type: "", message: "" });

    if (!uid) {
      setPwStatus({ type: "error", message: "Your session has expired. Please log in again." });
      return;
    }
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwStatus({ type: "error", message: "Please fill in every field." });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwStatus({ type: "error", message: "New password and confirmation don't match." });
      return;
    }
    if (passwordStrength(pwForm.next) < 3) {
      setPwStatus({ type: "error", message: "Choose a stronger password (mix upper/lowercase, numbers, symbols)." });
      return;
    }

    setPwSubmitting(true);
    try {
      const currentHash = profile?.password || "";
      const matches = await bcrypt.compare(pwForm.current.trim(), currentHash);

      if (!matches) {
        setPwStatus({ type: "error", message: "Your current password is incorrect." });
        return;
      }

      const newHash = await bcrypt.hash(pwForm.next.trim(), 10);
      await updateDoc(doc(db, "users", uid), { password: newHash });

      setProfile((p) => ({ ...(p || {}), password: newHash }));
      setPwStatus({ type: "success", message: "Password updated successfully." });
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      console.error("Password update failed:", err);
      setPwStatus({ type: "error", message: "Couldn't update your password. Please try again." });
    } finally {
      setPwSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-10 sm:pb-12 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          <div className={`h-56 sm:h-64 rounded-2xl animate-pulse ${darkMode ? "bg-slate-900" : "bg-gray-100"}`} />
          <div className={`lg:col-span-2 h-56 sm:h-64 rounded-2xl animate-pulse ${darkMode ? "bg-slate-900" : "bg-gray-100"}`} />
        </div>
      </div>
    );
  }

  const strength = passwordStrength(pwForm.next);

  const cardClass = `rounded-2xl p-5 sm:p-6 shadow-sm border ${
    darkMode ? "bg-slate-900 border-slate-700 shadow-black/30" : "bg-white border-gray-100"
  }`;

  const inputClass = `w-full px-3.5 py-2.5 pr-11 rounded-lg text-base sm:text-sm border transition-colors duration-150 outline-none ${
    darkMode
      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500"
  }`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-10 sm:pb-12">
        <div className="mb-5 sm:mb-6">
          <h1 className={`text-lg sm:text-xl font-semibold ${darkMode ? "text-white" : "text-pink-600"}`}>Profile</h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
            Manage your personal information and account security
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* LEFT: AVATAR CARD */}
          <div className="lg:col-span-1">
            <div className={`${cardClass} text-center lg:sticky lg:top-6`}>
              <div className="relative inline-block">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover mx-auto ring-4 ${
                      darkMode ? "ring-pink-500/10" : "ring-pink-50"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl mx-auto flex items-center justify-center text-lg sm:text-xl font-semibold text-white bg-gradient-to-br from-pink-500 to-pink-700 ring-4 ${
                      darkMode ? "ring-pink-500/10" : "ring-pink-50"
                    }`}
                  >
                    {getInitials(displayName)}
                  </div>
                )}
              </div>

              <h3 className={`mt-4 text-base font-semibold truncate px-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                {displayName}
              </h3>
              <p className={`text-xs truncate px-2 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                {profile?.username || "—"}
              </p>

              {profile?.role && (
                <span
                  className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium max-w-full truncate ${
                    darkMode ? "bg-pink-500/10 text-pink-300" : "bg-pink-50 text-pink-600"
                  }`}
                >
                  {profile.role}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: INFO + SECURITY */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          {/* PERSONAL INFORMATION */}
          <div className={cardClass}>
            <h3 className={`text-sm font-semibold mb-4 ${darkMode ? "text-white" : "text-pink-600"}`}>
              Personal information
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InfoField label="Full name" value={formatName(profile)} darkMode={darkMode} />
              <InfoField label="Username" value={profile?.username || "—"} darkMode={darkMode} />
              <InfoField label="Role" value={profile?.role || "—"} darkMode={darkMode} />
              <InfoField label="Position" value={profile?.position || "—"} darkMode={darkMode} />
              {profile?.studentId && <InfoField label="Student ID" value={profile.studentId} darkMode={darkMode} />}
              <InfoField label="Status" value={profile?.status || "—"} darkMode={darkMode} />
              <InfoField label="Date created" value={formatDate(profile?.createdAt)} darkMode={darkMode} />
              <InfoField label="Last login" value={formatDate(profile?.lastLoginAt)} darkMode={darkMode} />
            </dl>
          </div>

          {/* CHANGE PASSWORD */}
          <div className={cardClass}>
            <h3 className={`text-sm font-semibold mb-1 ${darkMode ? "text-white" : "text-pink-600"}`}>
              Change password
            </h3>
            <p className={`text-xs mb-4 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
              Use a strong password you don't use elsewhere
            </p>

            <form onSubmit={handlePwSubmit} className="space-y-4" noValidate>
              <PasswordField
                label="Current password"
                autoComplete="current-password"
                value={pwForm.current}
                onChange={(v) => setPwForm((f) => ({ ...f, current: v }))}
                visible={showPw.current}
                onToggleVisible={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                darkMode={darkMode}
                inputClass={inputClass}
              />
              <PasswordField
                label="New password"
                autoComplete="new-password"
                value={pwForm.next}
                onChange={(v) => setPwForm((f) => ({ ...f, next: v }))}
                visible={showPw.next}
                onToggleVisible={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                darkMode={darkMode}
                inputClass={inputClass}
              />

              {pwForm.next && (
                <div>
                  <div className="flex gap-1 mb-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                          i < strength ? strengthMeta[strength].color : darkMode ? "bg-slate-700" : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {strengthMeta[strength].label}
                  </p>
                </div>
              )}

              <PasswordField
                label="Confirm new password"
                autoComplete="new-password"
                value={pwForm.confirm}
                onChange={(v) => setPwForm((f) => ({ ...f, confirm: v }))}
                visible={showPw.confirm}
                onToggleVisible={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                darkMode={darkMode}
                inputClass={inputClass}
              />

              {pwStatus.message && (
                <div
                  role="alert"
                  className={`flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium ${
                    pwStatus.type === "success"
                      ? darkMode
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-emerald-50 text-emerald-700"
                      : darkMode
                      ? "bg-red-500/10 text-red-400"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {pwStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={pwSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium
                  hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2
                  active:scale-[0.98] transition-all duration-150 shadow-sm shadow-pink-600/30 disabled:opacity-60 disabled:active:scale-100"
              >
                {pwSubmitting ? "Updating…" : "Update password"}
              </button>
            </form>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function InfoField({ label, value, darkMode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide mb-0.5 text-pink-600">
        {label}
      </dt>
      <dd className={`text-sm truncate ${darkMode ? "text-white" : "text-gray-900"}`} title={typeof value === "string" ? value : undefined}>
        {value}
      </dd>
    </div>
  );
}

function PasswordField({ label, value, onChange, visible, onToggleVisible, darkMode, inputClass, autoComplete }) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-slate-300" : "text-pink-600"}`}>
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 ${
            darkMode ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"
          }`}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}