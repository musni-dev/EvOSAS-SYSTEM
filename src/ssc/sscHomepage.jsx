import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { collection, query, where, getDocs, addDoc, updateDoc, getDoc, doc, serverTimestamp, Timestamp,} from "firebase/firestore";
import { ScanLine, Camera, AlertCircle, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, Calendar, Home, QrCode, MoreVertical,} from "lucide-react";
import { db, auth } from "../firebase/firebase"; // adjust path to your firebase config
import { signOut, onAuthStateChanged } from "firebase/auth";
import bcrypt from "bcryptjs";
import {
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiMail,
  FiShield,
  FiHash,
  FiX,
  FiBriefcase,
  FiAward,
  FiLogOut,
} from "react-icons/fi";



export default function sscHomepage({ darkMode = false }) {
  const [view, setView] = useState("home"); // "home" | "scan" | "confirm"
  const [scanResult, setScanResult] = useState(null); // decoded payload passed to confirm view

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-pink-100">
      {view === "home" && (
        <HomeView
          onScanPress={() => setView("scan")}
          darkMode={darkMode}
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

function HomeView({ onScanPress, darkMode }) {
  // This app doesn't use Firebase Authentication for SSC Officer accounts —
  // login stores the user's info in sessionStorage under "userData" instead,
  // so we read the greeting name from there (auth.currentUser is always
  // empty for this login path).
  const getOfficerName = () => {
    try {
      const userData = JSON.parse(sessionStorage.getItem("userData"));
      const fullName = [userData?.firstName, userData?.lastName].filter(Boolean).join(" ");
      if (fullName) return fullName;
      if (userData?.username) return userData.username;
    } catch {
      // ignore parse errors, fall through
    }
    return auth.currentUser?.displayName || "Officer";
  };

  const officerName = getOfficerName();
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

const handleLogout = async () => {
  try {
    await signOut(auth);

    localStorage.clear();
    sessionStorage.clear();

    window.location.href = "/";
  } catch (err) {
    console.error("Logout error:", err);
  }
};

  // Close the dropdown when clicking outside of it
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  return (
    <div className="min-h-screen w-full flex flex-col px-4 py-6 sm:py-10">
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex-1 flex flex-col">

        <div className="w-full flex justify-end mb-4 relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="p-2 rounded-full text-gray-500 hover:bg-pink-100 active:bg-pink-200 transition"
            aria-label="More options"
            aria-expanded={showMenu}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div
              className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg shadow-pink-200/50 border border-pink-100 overflow-hidden z-20 animate-scale-in"
              role="menu"
            >
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowProfile(true);
                }}
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-pink-50 transition"
              >
                <FiUser className="w-4 h-4 text-pink-600" />
                My Profile
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleLogout();
                }}
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition border-t border-pink-100"
              >
                <FiLogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
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

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        darkMode={darkMode}
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
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scale-in {
          animation: scale-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* PROFILE MODAL                                                           */
/* ---------------------------------------------------------------------- */

function ProfileModal({ isOpen, onClose, darkMode }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [updating, setUpdating] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    // This app doesn't use Firebase Authentication for user identity — login
    // stores the Firestore "users" document id in sessionStorage instead.
    // We check a few likely keys so this keeps working regardless of exactly
    // how the login screen saved it.
    const getLoggedInUid = () => {
      const directUid = sessionStorage.getItem("uid");
      if (directUid) return directUid;

      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        if (userData?.uid) return userData.uid;
        if (userData?.id) return userData.id;
      } catch {
        // ignore parse errors, fall through
      }

      return auth.currentUser?.uid || null;
    };

    const fetchProfile = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const uid = getLoggedInUid();
        if (!uid) {
          throw new Error("No logged-in user found. Please log in again.");
        }
        const docRef = doc(db, "users", uid);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          throw new Error("Profile not found.");
        }
        if (isMounted) {
          setProfile({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        if (isMounted) setFetchError(err.message || "Failed to load profile.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Reset password fields & messages whenever the modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
      setPasswordMessage({ type: "", text: "" });
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getInitials = () => {
    if (!profile) return "?";
    const first = profile.firstName?.trim()?.[0] || "";
    const last = profile.lastName?.trim()?.[0] || "";
    const initials = `${first}${last}`.toUpperCase();
    return initials || "?";
  };

  const getFullName = () => {
    if (!profile) return "";
    return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ");
  };

  const isActive = (profile?.status || "").toLowerCase() === "active";

  const validatePassword = () => {
    const errors = {};
    if (!currentPassword) {
      errors.current = "Current password is required.";
    }
    if (!newPassword) {
      errors.new = "New password is required.";
    } else if (newPassword.length < 8) {
      errors.new = "New password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.new = "New password must contain an uppercase letter.";
    } else if (!/[a-z]/.test(newPassword)) {
      errors.new = "New password must contain a lowercase letter.";
    } else if (!/[0-9]/.test(newPassword)) {
      errors.new = "New password must contain a number.";
    }
    if (!confirmPassword) {
      errors.confirm = "Please confirm your new password.";
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirm = "Passwords do not match.";
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: "", text: "" });

    if (!validatePassword()) return;

    if (!profile || !profile.id) {
      setPasswordMessage({ type: "error", text: "Profile not loaded yet." });
      return;
    }

    setUpdating(true);
    try {
      // Passwords are stored bcrypt-hashed in Firestore (see the users
      // collection), so we compare against the hash instead of using
      // Firebase Auth reauthentication.
      const isCurrentCorrect = await bcrypt.compare(currentPassword, profile.password || "");
      if (!isCurrentCorrect) {
        setPasswordMessage({ type: "error", text: "Current password is incorrect." });
        setUpdating(false);
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

      await updateDoc(doc(db, "users", profile.id), {
        password: hashedPassword,
        updatedAt: serverTimestamp(),
      });

      setProfile((p) => ({ ...p, password: hashedPassword }));
      setPasswordMessage({ type: "success", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
    } catch (err) {
      console.error("Password update error:", err);
      setPasswordMessage({ type: "error", text: "Failed to update password. Please try again." });
    } finally {
      setUpdating(false);
    }
  };

  const cardBg = darkMode ? "bg-gray-900" : "bg-white";
  const textPrimary = darkMode ? "text-gray-100" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-500";
  const borderColor = darkMode ? "border-gray-700" : "border-pink-100";
  const sectionBg = darkMode ? "bg-gray-800" : "bg-pink-50";
  const inputClass = darkMode
    ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500"
    : "bg-white border-pink-200 text-gray-900 placeholder-gray-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/50 backdrop-blur-sm transition-opacity duration-200 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border ${borderColor} ${cardBg} transition-all duration-200 animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 border-b ${borderColor} ${cardBg}`}>
          <h2 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${textPrimary}`}>
            <FiUser className="text-pink-500" />
            My Profile
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition ${darkMode ? "hover:bg-gray-800" : "hover:bg-pink-50"}`}
            aria-label="Close"
          >
            <FiX className={textPrimary} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
              <p className={`text-sm ${textSecondary}`}>Loading profile...</p>
            </div>
          )}

          {!loading && fetchError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              <span>{fetchError}</span>
            </div>
          )}

          {!loading && !fetchError && profile && (
            <>
              {/* Account Details */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${textSecondary}`}>
                  Account Details
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-pink-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-pink-200 flex-shrink-0">
                    {getInitials()}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold truncate ${textPrimary}`}>{getFullName()}</p>
                    <p className={`text-sm truncate ${textSecondary}`}>@{profile.username}</p>
                  </div>
                </div>
              </div>

              {/* Information */}
              <div className={`rounded-xl border ${borderColor} ${sectionBg} p-4 space-y-3`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>
                  Information
                </p>

                <InfoRow icon={<FiHash />} label="Student ID" value={profile.studentId} darkMode={darkMode} />
                <InfoRow icon={<FiBriefcase />} label="Position" value={profile.position} darkMode={darkMode} />
                <InfoRow icon={<FiAward />} label="Role" value={profile.role} darkMode={darkMode} />
                <InfoRow icon={<FiMail />} label="Email" value={profile.email} darkMode={darkMode} />

                <div className="flex items-center justify-between gap-3">
                  <span className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                    <FiShield />
                    Status
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${isActive ? "text-green-600" : "text-gray-500"}`}>
                    <span className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
                    {profile.status || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Change Password */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${textSecondary}`}>
                  <FiLock />
                  Change Password
                </p>

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <PasswordField
                    label="Current Password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    show={showCurrent}
                    onToggle={() => setShowCurrent((v) => !v)}
                    error={passwordErrors.current}
                    inputClass={inputClass}
                    darkMode={darkMode}
                  />
                  <PasswordField
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showNew}
                    onToggle={() => setShowNew((v) => !v)}
                    error={passwordErrors.new}
                    inputClass={inputClass}
                    darkMode={darkMode}
                  />
                  <PasswordField
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirm}
                    onToggle={() => setShowConfirm((v) => !v)}
                    error={passwordErrors.confirm}
                    inputClass={inputClass}
                    darkMode={darkMode}
                  />

                  {passwordMessage.text && (
                    <div
                      className={`text-sm px-3 py-2 rounded-lg ${
                        passwordMessage.type === "success"
                          ? "bg-green-50 text-green-600 border border-green-200"
                          : "bg-red-50 text-red-600 border border-red-200"
                      }`}
                    >
                      {passwordMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pink-600
                               hover:bg-pink-700 active:bg-pink-800 disabled:opacity-60 disabled:cursor-not-allowed
                               text-white font-semibold text-sm shadow-md shadow-pink-200 transition"
                  >
                    {updating ? "Updating Password..." : "Update Password"}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

function InfoRow({ icon, label, value, darkMode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`flex items-center gap-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        {icon}
        {label}
      </span>
      <span className={`text-sm font-medium truncate max-w-[60%] text-right ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, error, inputClass, darkMode }) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pr-10 pl-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-pink-400 transition ${inputClass}`}
          placeholder={label}
        />
        <button
          type="button"
          onClick={onToggle}
          className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600"}`}
          tabIndex={-1}
        >
          {show ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
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
  async (raw) => {
    setScanning(false);
    stopCamera();

    let payload;

    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { sessionId: raw };
    }

    const sessionId = payload.sessionId;

    if (!sessionId) {
      setScanError("Invalid QR code.");
      setScanning(true);
      return;
    }

    // 🔥 CHECK SESSION FROM FIRESTORE
    const sessionRef = doc(db, "sessions", sessionId);
    const snap = await getDoc(sessionRef);

    if (!snap.exists()) {
      setScanError("Session not found.");
      setScanning(true);
      return;
    }

    const session = snap.data();

    if (session.status !== "active") {
      setScanError("Session already ended.");
      setScanning(true);
      return;
    }

    const endDateTime = new Date(`${session.eventDate}T${session.qrEndTime}`);

    if (new Date() > endDateTime) {
      setScanError("QR Code expired.");
      setScanning(true);
      return;
    }

    // ✅ PASS ONLY VALID
    onDecoded({ sessionId });
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
  const { sessionId } = payload;

  const user = JSON.parse(sessionStorage.getItem("userData"));

  if (!user) {
    setStatus("error");
    setMessage("Not logged in.");
    return;
  }

  try {
    const attendanceRef = collection(db, "attendance");

    const q = query(
      attendanceRef,
      where("sessionId", "==", sessionId),
      where("studentId", "==", user.studentId)
    );

    const snap = await getDocs(q);

    // =========================
    // CASE 1: NO RECORD → TIME IN
    // =========================
    if (snap.empty) {
      const newRecord = {
        sessionId,
        studentId: user.studentId,
        studentName: `${user.firstName} ${user.lastName}`,
        position: user.position,
        role: user.role,
        timeIn: serverTimestamp(),
        timeOut: null,
        createdAt: serverTimestamp(),
      };

      await addDoc(attendanceRef, newRecord);

      setStatus("success");
      setMessage("Time-in recorded successfully.");
      return;
    }

    // =========================
    // CASE 2: EXISTING RECORD → TIME OUT
    // =========================
    const docRef = snap.docs[0].ref;
    const data = snap.docs[0].data();

    if (data.timeOut) {
      setStatus("already");
      setMessage("Already timed out.");
      return;
    }

    await updateDoc(docRef, {
      timeOut: serverTimestamp(),
    });

    setStatus("success");
    setMessage("Time-out recorded successfully.");
  } catch (err) {
    console.error(err);
    setStatus("error");
    setMessage("Failed to record attendance.");
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