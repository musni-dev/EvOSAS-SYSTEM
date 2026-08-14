import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import bcrypt from "bcryptjs";
import {
  FaEye,
  FaEyeSlash,
  FaUser,
  FaLock,
  FaShieldAlt,
  FaExclamationTriangle,
  FaTimesCircle,
  FaTimes,
} from "react-icons/fa";
import { FaBookOpen, FaClipboardCheck, FaBoxOpen, FaStar,} from "react-icons/fa";
import { IoDocumentAttach } from "react-icons/io5";


import dctLogo from "../assets/dct-logo.png";
import osasLogo from "../assets/osas-logo.png";
import sscLogo from "../assets/ssc-logo.png";
import wolfBg from "../assets/wolf.png";

import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { logLogin } from "../utils/auditTrail";

// ===== Login throttling config =====
const MAX_ATTEMPTS = 5;
const LOCKOUT_BASE_MIN = 10;   // first lockout duration
const LOCKOUT_STEP_MIN = 15;   // added each time it happens again

const LS_ATTEMPTS = "loginFailedAttempts";
const LS_LOCKOUT_UNTIL = "loginLockoutUntil";
const LS_LOCKOUT_STAGE = "loginLockoutStage";

function getLockoutStatus() {
  const lockoutUntil = parseInt(localStorage.getItem(LS_LOCKOUT_UNTIL) || "0", 10);
  const now = Date.now();
  if (lockoutUntil && now < lockoutUntil) {
    return { locked: true, remainingMs: lockoutUntil - now };
  }
  return { locked: false, remainingMs: 0 };
}

// Call this whenever a login attempt fails with wrong credentials
function registerFailedAttempt() {
  const attempts = parseInt(localStorage.getItem(LS_ATTEMPTS) || "0", 10) + 1;

  if (attempts >= MAX_ATTEMPTS) {
    const stage = parseInt(localStorage.getItem(LS_LOCKOUT_STAGE) || "0", 10) + 1;
    const durationMin = LOCKOUT_BASE_MIN + (stage - 1) * LOCKOUT_STEP_MIN;
    const lockoutUntil = Date.now() + durationMin * 60 * 1000;

    localStorage.setItem(LS_LOCKOUT_STAGE, String(stage));
    localStorage.setItem(LS_LOCKOUT_UNTIL, String(lockoutUntil));
    localStorage.setItem(LS_ATTEMPTS, "0"); // reset counter for the next round

    return { justLocked: true, durationMin };
  }

  localStorage.setItem(LS_ATTEMPTS, String(attempts));
  return { justLocked: false, attemptsLeft: MAX_ATTEMPTS - attempts };
}

// Call this on a successful login
function resetLoginThrottle() {
  localStorage.removeItem(LS_ATTEMPTS);
  localStorage.removeItem(LS_LOCKOUT_UNTIL);
  localStorage.removeItem(LS_LOCKOUT_STAGE);
}

function formatRemaining(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
const [showPassword, setShowPassword] = useState(false);

  // ===== Login throttling state =====
  const [lockoutRemainingMs, setLockoutRemainingMs] = useState(0);

  // ===== Toast notification state (replaces window.alert) =====
  const [notification, setNotification] = useState(null); // { id, type: 'error' | 'warning', title, message }

  const showNotification = useCallback((message, type = "error", title) => {
    setNotification({
      id: Date.now(),
      type,
      title: title || (type === "warning" ? "Attention" : "Login Failed"),
      message,
    });
  }, []);

  const dismissNotification = useCallback(() => setNotification(null), []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const refreshLockoutStatus = useCallback(() => {
    const { locked, remainingMs } = getLockoutStatus();
    setLockoutRemainingMs(locked ? remainingMs : 0);
  }, []);

  useEffect(() => {
    refreshLockoutStatus();
    const interval = setInterval(refreshLockoutStatus, 1000);
    return () => clearInterval(interval);
  }, [refreshLockoutStatus]);

  const isLockedOut = lockoutRemainingMs > 0;

  const handleLogin = async (e) => {
    e.preventDefault();

    // ===== Block login while locked out =====
    const { locked, remainingMs } = getLockoutStatus();
    if (locked) {
      showNotification(
        `Too many failed login attempts. Please try again in ${formatRemaining(
          remainingMs
        )}.`,
        "warning",
        "Account Locked"
      );
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("role", "Administrator");
      // Firebase Auth admin login also gets a uid saved, in case any admin
      // screens later need to look up their own Firestore user record.
      if (auth.currentUser?.uid) {
        localStorage.setItem("uid", auth.currentUser.uid);
      }

      window.dispatchEvent(new Event("authChanged"));

      // AUDIT TRAIL: log this successful Administrator login (Firebase Auth path)
      await logLogin(auth.currentUser, {
        role: "Administrator",
        name: "Administrator",
      });

      // successful login — clear any throttle state
      resetLoginThrottle();

      const accepted = localStorage.getItem("acceptedTerms");

      if (!accepted) {
        navigate("/terms");
      } else {
        navigate("/admin/homepage");
      }

      return;
    } catch (authError) {
      console.log("Firebase Auth Failed:", authError.message);

      try {
        const snapshot = await getDocs(collection(db, "users"));

          const foundUser = snapshot.docs.find((userDoc) => {
            const data = userDoc.data();

            return (
              String(data.username || "").toLowerCase().trim() ===
                email.toLowerCase().trim() &&
              data.status === "Active"
            );
          });

        if (!foundUser) {
          const result = registerFailedAttempt();
          refreshLockoutStatus();
          if (result.justLocked) {
            showNotification(
              `Invalid username or password. Too many failed attempts — please try again in ${result.durationMin} minutes.`,
              "warning",
              "Account Locked"
            );
          } else {
            showNotification(
              `Invalid username or password. ${result.attemptsLeft} attempt(s) left before lockout.`,
              "error"
            );
          }
          return;
        }

        const userData = foundUser.data();

        const passwordMatch = await bcrypt.compare(
          password.trim(),
          userData.password
        );

        if (!passwordMatch) {
          const result = registerFailedAttempt();
          refreshLockoutStatus();
          if (result.justLocked) {
            showNotification(
              `Invalid username or password. Too many failed attempts — please try again in ${result.durationMin} minutes.`,
              "warning",
              "Account Locked"
            );
          } else {
            showNotification(
              `Invalid username or password. ${result.attemptsLeft} attempt(s) left before lockout.`,
              "error"
            );
          }
          return;
        }
        await updateDoc(
          doc(db, "users", foundUser.id),
          {
            lastLoginAt: serverTimestamp(),
          }
        );

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("role", userData.role);
        localStorage.setItem("userData", JSON.stringify(userData));
        // Save the Firestore document ID of the logged-in user so other
        // pages (e.g. the Profile modal) can look up and update their
        // own "users" record.
        localStorage.setItem("uid", foundUser.id);

        // successful login — clear any throttle state
        resetLoginThrottle();




        window.dispatchEvent(new Event("authChanged"));

        // AUDIT TRAIL: log this successful login (Firestore-based accounts)
        const loggedInName =
          [userData.firstName, userData.lastName].filter(Boolean).join(" ") ||
          userData.username;

        await logLogin(
          {
            uid: foundUser.id,
            email: userData.username,
            displayName: loggedInName,
            photoURL: userData.photoURL || "",
          },
          {
            role: userData.role,
            department: userData.position,
            name: loggedInName,
          }
        );

        switch (userData.role) {
          case "Administrator":
            navigate("/admin/homepage");
            break;
          case "SSC Officer":
            navigate("/ssc/homepage");
            break;
          case "Student Disciplinary Officer":
            navigate("/sdo/homepage");
            break;
          case "Student Organization Coordinator":
            navigate("/soc/homepage");
            break;
          default:
            showNotification("Role not recognized.", "error");
        }
      } catch (err) {
        console.error("Firestore Login Error:", err);
        showNotification("Login failed. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const featureCards = [
    { icon: FaBookOpen, label: "Student Records" },
    { icon: FaClipboardCheck, label: "Attendance" },
    { icon: FaBoxOpen, label: "Lost & Found" },
    { icon: FaStar, label: "Event Evaluation" },
    { icon: IoDocumentAttach , label: "Files" },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white font-sans">
      {/* ===== Toast notification (replaces window.alert) ===== */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm animate-toast-in">
          <div
            className={`flex items-start gap-3 rounded-2xl shadow-2xl border px-4 py-3.5 backdrop-blur-md ${
              notification.type === "warning"
                ? "bg-amber-50/95 border-amber-200 shadow-amber-500/10"
                : "bg-white/95 border-[#ff6699]/25 shadow-[#ff6699]/15"
            }`}
          >
            <div
              className={`flex-shrink-0 mt-0.5 flex items-center justify-center w-8 h-8 rounded-full ${
                notification.type === "warning"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-[#ffe4ee] text-[#ff6699]"
              }`}
            >
              {notification.type === "warning" ? (
                <FaExclamationTriangle size={14} />
              ) : (
                <FaTimesCircle size={14} />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p
                className={`text-xs font-extrabold tracking-wide uppercase ${
                  notification.type === "warning" ? "text-amber-700" : "text-[#e04f80]"
                }`}
              >
                {notification.title}
              </p>
              <p className="text-sm font-medium text-[#1a1a1a]/85 leading-snug mt-0.5">
                {notification.message}
              </p>
            </div>

            <button
              type="button"
              onClick={dismissNotification}
              aria-label="Dismiss notification"
              className="flex-shrink-0 mt-0.5 text-[#1a1a1a]/35 hover:text-[#1a1a1a]/70 transition-colors"
            >
              <FaTimes size={13} />
            </button>
          </div>

          {/* auto-dismiss progress bar */}
          <div
            className={`h-0.5 rounded-full mt-1 overflow-hidden ${
              notification.type === "warning" ? "bg-amber-200/60" : "bg-[#ff6699]/20"
            }`}
          >
            <div
              key={notification.id}
              className={`h-full animate-toast-progress ${
                notification.type === "warning" ? "bg-amber-500" : "bg-[#ff6699]"
              }`}
            />
          </div>
        </div>
      )}

      {/* ===== LEFT — solid dark branding panel (desktop only) ===== */}
      <div className="hidden md:flex md:w-[46%] lg:w-1/2 relative flex-col justify-center px-14 lg:px-20 py-16 bg-[#171018] overflow-hidden">
        {/* ambient glow accents */}
        <div className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-[#ff6699]/25 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#ff77aa]/20 blur-[110px]" />
        <svg
          className="pointer-events-none absolute top-12 right-12 w-20 h-20 text-white/10"
          viewBox="0 0 100 100"
          fill="none"
        >
          <polygon points="50,3 100,50 50,97 0,50" stroke="currentColor" strokeWidth="2" />
        </svg>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-10">
            <img src={dctLogo} alt="Dominican College of Tarlac" className="h-7 w-auto object-contain" />
            <span className="text-xs font-medium tracking-wide text-white">
              Dominican College of Tarlac
            </span>
          </div>

          <div className="flex items-center gap-5 mb-7">
            <div className="rounded-2xl bg-white shadow-lg p-3 transition-transform duration-300 hover:scale-105">
              <img src={osasLogo} alt="OSAS Logo" className="h-14 w-auto object-contain" />
            </div>
            <div className="rounded-2xl bg-white shadow-lg p-3 transition-transform duration-300 hover:scale-105">
              <img src={sscLogo} alt="SSC Logo" className="h-14 w-auto object-contain" />
            </div>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-4">
            EvOSAS
            <br />
            <span className="bg-gradient-to-r from-[#ff6699] to-[#ff9fbb] bg-clip-text text-transparent">
              Portal System
            </span>
          </h1>

          <p className="text-base font-semibold text-[#ff9fbb] mb-5">
            The Official Evolution of the Office of Student Affairs and Services
          </p>

          <p className="text-white/90 leading-relaxed max-w-md mb-10">
            The official digital platform for managing disciplinary cases, 
            loast-and-found items, SSC attendance, event evaluations, and 
            student organization files — all in one secure place.
          </p>

          <div className="flex flex-wrap gap-3 max-w-md">
            {featureCards.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5"
              >
                <Icon className="text-[#ff9fbb]" size={14} />
                <span className="text-sm font-medium text-white whitespace-nowrap">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== RIGHT — login card (all viewports) ===== */}
      <div className="w-full md:w-[54%] lg:w-1/2 flex flex-col min-h-screen bg-white relative">
        <div className="pointer-events-none absolute top-0 right-0 w-72 h-72 rounded-full bg-[#fff1f6] blur-[90px] -z-0" />

        {/* Mobile header */}
        <div className="flex md:hidden flex-col items-center gap-4 pt-10 pb-2 px-6 relative z-10">
          <div className="flex items-center gap-2">
            <img src={dctLogo} alt="Dominican College of Tarlac" className="h-6 w-auto object-contain" />
            <span className="text-[11px] font-medium tracking-wide text-[#1a1a1a]">
              Dominican College of Tarlac
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#fff1f6] shadow-sm p-2.5">
              <img src={osasLogo} alt="OSAS Logo" className="h-12 w-auto object-contain" />
            </div>
            <div className="rounded-2xl bg-[#fff1f6] shadow-sm p-2.5">
              <img src={sscLogo} alt="SSC Logo" className="h-12 w-auto object-contain" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-center text-[#1a1a1a] tracking-tight">
            EvOSAS Portal System
          </h1>
          <p className="text-xs text-center font-medium text-[#ff6699] max-w-xs leading-relaxed">
            The Official Evolution of the Office of Student Affairs and Services
          </p>
        </div>

        {/* Login card */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10 relative z-10">
          <div className="w-full max-w-[420px]">
            <div className="rounded-2xl bg-white border border-[#1a1a1a]/10 shadow-2xl shadow-[#ff6699]/10 px-7 sm:px-10 py-9 sm:py-10">
              <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-2">
                Welcome Back
              </h2>
              <p className="text-sm font-medium text-[#1a1a1a]/70 mb-8">
                Sign in to continue to your EvOSAS account.
              </p>

              {isLockedOut && (
                <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center">
                  <p className="text-xs font-bold text-red-600">
                    Account temporarily locked due to too many failed attempts.
                  </p>
                  <p className="text-sm font-extrabold text-red-700 mt-1">
                    Try again in {formatRemaining(lockoutRemainingMs)}
                  </p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Username / Email */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="login-email"
                    className="text-xs font-bold text-[#1a1a1a] pl-0.5"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <FaUser
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff6699]"
                      size={14}
                    />
                    <input
                      id="login-email"
                      type="text"
                      placeholder="Enter your email or username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border-2 border-[#1a1a1a]/15 text-[#1a1a1a] placeholder-[#1a1a1a]/45 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#ff6699]/15 focus:border-[#ff6699] transition-all duration-200"
                      required
                      disabled={isLockedOut}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-bold text-[#1a1a1a] pl-0.5"
                  >
                    Password
                  </label>
                  <div className="relative w-full">
                    <FaLock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff6699]"
                      size={14}
                    />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-white border-2 border-[#1a1a1a]/15 text-[#1a1a1a] placeholder-[#1a1a1a]/45 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#ff6699]/15 focus:border-[#ff6699] transition-all duration-200"
                      required
                      disabled={isLockedOut}
                    />

                    {password && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1a1a1a]/50 hover:text-[#ff6699] transition-colors"
                      >
                        {showPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs font-bold text-[#ff6699] hover:text-[#e04f80] hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || isLockedOut}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-[#ff6699] to-[#ff77aa] shadow-lg shadow-[#ff6699]/35 hover:shadow-xl hover:shadow-[#ff6699]/45 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                >
                  {isLockedOut
                    ? `Locked (${formatRemaining(lockoutRemainingMs)})`
                    : loading
                    ? "Logging in..."
                    : "Login"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer — Data Privacy Notice */}
        <footer className="px-6 pb-6 relative z-10">
          <div className="max-w-[420px] mx-auto flex flex-col items-center gap-2 text-center rounded-xl bg-[#fff1f6] border border-[#ff6699]/15 px-5 py-4">
            <FaShieldAlt className="text-[#ff6699]" size={16} />
            <p className="text-[11px] font-extrabold text-[#1a1a1a] tracking-wide uppercase">
              Data Privacy Notice
            </p>
            <p className="text-xs font-medium text-[#1a1a1a]/75 leading-relaxed">
              By signing in, you acknowledge that your personal information will
              be processed in accordance with the Data Privacy Act of 2012
              (Republic Act No. 10173). EvOSAS collects and uses your
              information solely for legitimate educational and administrative
              purposes while ensuring the confidentiality, integrity, and
              security of your personal data.
            </p>
          </div>
        </footer>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; }
        }

        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, -14px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-toast-in {
          animation: toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-progress {
          animation: toast-progress 5s linear forwards;
        }
      `}</style>
    </div>
  );
}