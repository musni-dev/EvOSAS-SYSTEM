import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import { db, storage } from "../firebase/firebase";
import {
  collection, addDoc, serverTimestamp, onSnapshot, query, where, doc, updateDoc,
  getDoc, getDocs, runTransaction,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import {
  ScanLine, Camera, AlertCircle, ArrowLeft, RefreshCw, CheckCircle2, XCircle,
  Clock, Calendar, Home, QrCode,
} from "lucide-react";
import { FiX } from "react-icons/fi";
import bcrypt from "bcryptjs";

const DOCUMENT_TYPES = ["Profile", "Accomplishment Report", "By-laws"];

// NEW: must match the default password used in UsersPage (getNextDefaultPassword)
const DEFAULT_PASSWORD = "EvOSAS-2026";

const STATUS_CONFIG = {
  "In Progress": {
    badge: "bg-blue-100 text-blue-700 border border-blue-300",
    badgeDark: "bg-blue-500/10 text-blue-300 border border-blue-500/30",
    dot: "bg-blue-400",
    icon: "🔄",
    bar: "border-l-4 border-blue-400 bg-blue-50",
    barDark: "border-l-4 border-blue-500 bg-blue-500/5",
    message: "Your submission is being reviewed by the admin.",
  },
  Approved: {
    badge: "bg-green-100 text-green-700 border border-green-300",
    badgeDark: "bg-green-500/10 text-green-300 border border-green-500/30",
    dot: "bg-green-400",
    icon: "✅",
    bar: "border-l-4 border-green-500 bg-green-50",
    barDark: "border-l-4 border-green-500 bg-green-500/5",
    message: "Your document has been approved!",
  },
  Rejected: {
    badge: "bg-red-100 text-red-700 border border-red-300",
    badgeDark: "bg-red-500/10 text-red-300 border border-red-500/30",
    dot: "bg-red-400",
    icon: "❌",
    bar: "border-l-4 border-red-500 bg-red-50",
    barDark: "border-l-4 border-red-500 bg-red-500/5",
    message: "Your document was rejected. Please revise and re-submit.",
  },
};

const STATUSES = Object.keys(STATUS_CONFIG);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function SOCHomepage() {
  const navigate = useNavigate();

  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[2]);
  const [organization, setOrganization] = useState("");
  const [file, setFile] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // ---- Attendance (Scan) state ----
  const [view, setView] = useState("home"); // "home" | "scan" | "confirm"
  const [scanResult, setScanResult] = useState(null); // decoded payload passed to confirm view
  const [showRecords, setShowRecords] = useState(false);

  // Re-submit modal state
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitItem, setResubmitItem] = useState(null);
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);

  // Profile modal state
  // NOTE: the logged-in user's Firestore document ID ("uid") in the
  // "users" collection is saved to sessionStorage at login time under the key "uid"
  // (so it clears automatically when the tab/browser closes).
  // This same uid is now also used as the ownership key for uploaded documents
  // (see "uploadedBy" field below), so each SOC account only ever sees its own files.
  // If your login screen stores it under a different key, update the line below.
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null); // { type: "success" | "error", text }

  // NEW: force-change-password state (set by admin on create / reset password)
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [securityChecked, setSecurityChecked] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // NEW: live-watch the user's own document for the mustChangePassword flag.
  // If the admin resets the password while the user is online, they get locked too.
  useEffect(() => {
    const uid = sessionStorage.getItem("uid");
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

  const handleLogout = () => {
    // Auth state (isLoggedIn/uid/role/userData) lives in sessionStorage now
    // (see Login.jsx), so that's what actually needs to be cleared on logout.
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("uid");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("userData");
    // acceptedTerms is a persistent preference kept in localStorage.
    localStorage.removeItem("acceptedTerms");
    navigate("/login");
  };

  // ---- DATA ISOLATION FIX ----
  // Before: this query had no "where" clause, so every SOC account's
  // onSnapshot listener pulled ALL documents from "organization_bylaws",
  // regardless of who uploaded them — that's why every account saw every file.
  //
  // Fix: only load documents whose "uploadedBy" field matches the currently
  // logged-in user's uid (the same uid saved to sessionStorage at login,
  // see Login.jsx -> sessionStorage.setItem("uid", foundUser.id)).
  useEffect(() => {
    const uid = sessionStorage.getItem("uid");

    // No logged-in user identified -> show nothing rather than everything.
    if (!uid) {
      setUploads([]);
      return;
    }

    // NOTE: no orderBy here on purpose — combining where() on one field with
    // orderBy() on a different field requires a Firestore composite index to
    // be created manually in the console. To avoid depending on that, we sort
    // client-side instead (see the .sort() below), right after fetching.
    const q = query(
      collection(db, "organization_bylaws"),
      where("uploadedBy", "==", uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const files = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => (b.uploadedAt?.seconds ?? 0) - (a.uploadedAt?.seconds ?? 0));

        setUploads(files);
      },
      (error) => {
        // Surface the real reason instead of silently showing an empty table.
        // The most common cause here is a missing Firestore composite index
        // for (uploadedBy ==, uploadedAt desc) — Firebase's error message
        // includes a direct link to auto-create it in the console.
        console.error("organization_bylaws onSnapshot error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const validatePdf = (candidate) => {
    if (!candidate) {
      alert("Please select a PDF file.");
      return false;
    }
    if (candidate.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return false;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      alert("File size must not exceed 10MB.");
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!organization.trim()) {
      alert("Please enter organization name.");
      return;
    }

    if (!validatePdf(file)) return;

    // ---- DATA ISOLATION FIX ----
    // Require a logged-in uid before allowing an upload, and stamp the new
    // document with "uploadedBy" so it can later be filtered per-account.
    const uid = sessionStorage.getItem("uid");
    if (!uid) {
      alert("You must be logged in to upload a document.");
      return;
    }

    try {
      setLoading(true);

      const storageRef = ref(
        storage,
        `organization_bylaws/${Date.now()}_${file.name}`
      );

      await uploadBytes(storageRef, file);

      const fileURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "organization_bylaws"), {
        organization,
        documentType,
        fileName: file.name,
        fileURL,
        status: STATUSES[0],
        uploadedAt: serverTimestamp(),
        uploadedBy: uid, // ownership key used by the read query above
      });

      alert("File uploaded successfully!");

      setOrganization("");
      setFile(null);
      setDocumentType(DOCUMENT_TYPES[2]);

      const fileInput = document.getElementById("fileUpload");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error(error);
      alert("Upload failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openResubmitModal = (item) => {
    setResubmitItem(item);
    setResubmitFile(null);
    setResubmitModalOpen(true);
  };

  // Resubmitting updates the SAME document (same id) that the admin already
  // sees in their table, so the admin always keeps visibility of it — the
  // file, status, and timestamp are refreshed and status resets to
  // "In Progress" so it re-enters the admin's review queue right away.
  // documentType is left untouched so the admin still knows what kind of
  // document it is after a resubmission. The old file in Storage is deleted
  // after the new one is safely uploaded and linked, so re-submitting
  // doesn't leave orphaned files behind.
  const handleResubmit = async () => {
    if (!resubmitItem) return;
    if (!validatePdf(resubmitFile)) return;

    // ---- DATA ISOLATION FIX ----
    // Defense-in-depth: even though `uploads` (and therefore `resubmitItem`)
    // is already scoped to the current user's own documents via the filtered
    // query above, double-check ownership here before writing, in case of
    // stale state.
    const uid = sessionStorage.getItem("uid");
    if (!uid || resubmitItem.uploadedBy !== uid) {
      alert("You can only re-submit your own documents.");
      return;
    }

    try {
      setResubmitting(true);

      const oldFileURL = resubmitItem.fileURL;

      const newStorageRef = ref(
        storage,
        `organization_bylaws/${Date.now()}_${resubmitFile.name}`
      );

      await uploadBytes(newStorageRef, resubmitFile);
      const fileURL = await getDownloadURL(newStorageRef);

      await updateDoc(doc(db, "organization_bylaws", resubmitItem.id), {
        fileName: resubmitFile.name,
        fileURL,
        status: STATUSES[0],
        uploadedAt: serverTimestamp(),
        uploadedBy: uid, // keep ownership stamped on resubmit as well
      });

      // Only delete the old file once the new one is uploaded and the
      // Firestore record points to it, so nothing gets lost if something
      // fails earlier in the process.
      if (oldFileURL) {
        try {
          await deleteObject(ref(storage, oldFileURL));
        } catch (storageErr) {
          console.warn("Could not delete previous file from Storage:", storageErr);
        }
      }

      alert("Document re-submitted successfully!");
      setResubmitModalOpen(false);
      setResubmitItem(null);
      setResubmitFile(null);
    } catch (error) {
      console.error(error);
      alert("Re-submit failed: " + error.message);
    } finally {
      setResubmitting(false);
    }
  };

  // ----- Profile -----
  const openProfileModal = async () => {
    setProfileModalOpen(true);
    setProfileError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg(null);

    const uid = sessionStorage.getItem("uid");
    if (!uid) {
      setProfileError("No logged-in user found. Please log in again.");
      return;
    }

    setProfileLoading(true);
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        setProfileData({ id: snap.id, ...snap.data() });
      } else {
        setProfileError("Profile not found.");
      }
    } catch (error) {
      console.error(error);
      setProfileError("Failed to load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: "error", text: "Please fill in all password fields." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    // NEW: the new password can't be the default password or the same as the current one
    if (newPassword.trim() === DEFAULT_PASSWORD) {
      setPasswordMsg({ type: "error", text: "You can't use the default password. Please choose a different one." });
      return;
    }
    if (newPassword.trim() === currentPassword.trim()) {
      setPasswordMsg({ type: "error", text: "Your new password must be different from your current password." });
      return;
    }
    if (!profileData) {
      setPasswordMsg({ type: "error", text: "Profile not loaded yet." });
      return;
    }

    setPasswordSaving(true);
    try {
      // Passwords are stored bcrypt-hashed (see UsersPage.jsx), so we compare
      // the entered current password against the hash instead of doing a
      // plain string match.
      const isCurrentCorrect = await bcrypt.compare(currentPassword, profileData.password || "");
      if (!isCurrentCorrect) {
        setPasswordMsg({ type: "error", text: "Current password is incorrect." });
        setPasswordSaving(false);
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

      await updateDoc(doc(db, "users", profileData.id), {
        password: hashedPassword,
        mustChangePassword: false, // NEW: clears the flag, which unlocks the account
        updatedAt: serverTimestamp(),
      });

      setProfileData((p) => ({ ...p, password: hashedPassword, mustChangePassword: false }));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "success", text: "Password updated successfully." });
    } catch (error) {
      console.error(error);
      setPasswordMsg({ type: "error", text: "Failed to update password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  // NEW: while a password change is required, always bring the user back to the
  // home view and keep the (non-closable) profile modal open.
  useEffect(() => {
    if (!mustChangePassword) return;
    if (view !== "home") {
      setView("home");
      setScanResult(null);
    }
    if (!profileModalOpen) {
      openProfileModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mustChangePassword, profileModalOpen, view]);

  const cardClass = darkMode
    ? "bg-slate-900 border border-slate-700"
    : "bg-white border border-gray-100";

  const inputClass = darkMode
    ? "border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:ring-2 focus:ring-pink-500/30"
    : "border-gray-200 bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-pink-400";

  // NEW: don't show any feature until we know if a password change is required
  if (!securityChecked) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-950" : "bg-gray-50"}`}>
        <p className={`text-sm ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Loading…</p>
      </div>
    );
  }

  // ---- Attendance full-screen views (all hooks are declared above) ----
  if (view === "scan") {
    return (
      <ScanView
        onBack={() => setView("home")}
        onDecoded={(payload) => {
          setScanResult(payload);
          setView("confirm");
        }}
      />
    );
  }

  if (view === "confirm" && scanResult) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-pink-100">
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
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        darkMode ? "bg-slate-950 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >

      {/* Top Header Bar */}
      <div
        className={`px-4 sm:px-6 py-5 shadow-md ${
          darkMode ? "bg-slate-900 border-b border-slate-800" : "bg-pink-600 text-white"
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white">
              Student Organization Coordinator
            </h1>
            <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-pink-200"}`}>
              Manage organization by-laws and uploaded documents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={openProfileModal}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                darkMode
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-white text-pink-600 hover:bg-pink-50"
              }`}
            >
              👤 Profile
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                darkMode
                  ? "bg-yellow-500 text-black hover:bg-yellow-400"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              {darkMode ? "☀ Light" : "🌙 Dark"}
            </button>
            <button
              onClick={handleLogout}
              className={`font-semibold px-4 py-2 rounded-xl transition text-sm shadow-sm ${
                darkMode
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-white text-pink-600 hover:bg-pink-50"
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Attendance Section */}
        <div className={`rounded-2xl shadow-sm overflow-hidden ${cardClass}`}>
          <div className={`px-4 sm:px-6 py-4 border-b flex items-center gap-3 ${darkMode ? "border-slate-800" : "border-gray-100"}`}>
            <div className={`rounded-xl p-2 ${darkMode ? "bg-pink-500/10 text-pink-300" : "bg-pink-100 text-pink-600"}`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Attendance</h2>
              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                Scan the event QR code to time in or time out.
              </p>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => setView("scan")}
              disabled={mustChangePassword} // NEW
              className="group relative w-full sm:w-auto bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white px-6 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-pink-300/40 focus:outline-none focus:ring-4 focus:ring-pink-300"
            >
              <QrCode className="w-5 h-5" />
              Scan Attendance
            </button>
            <button
              onClick={() => setShowRecords(true)}
              disabled={mustChangePassword} // NEW
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 border-2 ${
                darkMode
                  ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                  : "border-pink-200 text-pink-600 hover:bg-pink-50"
              }`}
            >
              <Clock className="w-5 h-5" />
              View Records
            </button>
            <p className={`text-xs sm:ml-2 text-center sm:text-left ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
              Tap Scan Attendance and point your camera at the event QR code.
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className={`rounded-2xl shadow-sm overflow-hidden ${cardClass}`}>
          {/* Card Header */}
          <div className={`px-4 sm:px-6 py-4 border-b flex items-center gap-3 ${darkMode ? "border-slate-800" : "border-gray-100"}`}>
            <div className={`rounded-xl p-2 ${darkMode ? "bg-pink-500/10 text-pink-300" : "bg-pink-100 text-pink-600"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
              </svg>
            </div>
            <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Upload Organization Document</h2>
          </div>

          <div className="px-4 sm:px-6 py-6">
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? "text-slate-300" : "text-gray-600"}`}>
                  Organization Name
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Enter organization name"
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition focus:border-transparent ${inputClass}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? "text-slate-300" : "text-gray-600"}`}>
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition focus:border-transparent ${inputClass}`}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? "text-slate-300" : "text-gray-600"}`}>
                  Choose File
                </label>
                <input
                  id="fileUpload"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  className={`w-full border rounded-xl px-4 py-3 text-sm cursor-pointer outline-none transition file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:font-semibold file:text-xs transition ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-200 file:bg-pink-500/20 file:text-pink-300 hover:file:bg-pink-500/30"
                      : "border-gray-200 file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200"
                  }`}
                />
                <p className={`text-xs mt-2 flex items-center gap-1 ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                  <span>📄</span> PDF only 
                </p>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={handleUpload}
                disabled={loading || mustChangePassword} // NEW: mustChangePassword
                className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                    </svg>
                    Upload File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Status Legend */}
        <div className={`rounded-2xl shadow-sm px-4 sm:px-5 py-4 ${cardClass}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
            Status Legend
          </p>
          <div className="flex flex-wrap gap-3">
            {STATUSES.map((key) => {
              const cfg = STATUS_CONFIG[key];
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    darkMode ? cfg.badgeDark : cfg.badge
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {key}
                </span>
              );
            })}
          </div>
        </div>

        {/* Uploaded Files */}
        <div className={`rounded-2xl shadow-sm overflow-hidden ${cardClass}`}>
          {/* Card Header */}
          <div className={`px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${darkMode ? "border-slate-800" : "border-gray-100"}`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 ${darkMode ? "bg-pink-500/10 text-pink-300" : "bg-pink-100 text-pink-600"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>My Submitted Documents</h2>
                <p className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                  Status updates in real-time as admin reviews your files.
                </p>
              </div>
            </div>
            {uploads.length > 0 && (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full w-fit ${
                  darkMode ? "bg-pink-500/10 text-pink-300" : "bg-pink-100 text-pink-700"
                }`}
              >
                {uploads.length} file{uploads.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-[820px] w-full">
              <thead>
                <tr className="bg-pink-600 text-white text-sm">
                  <th className="px-5 py-3.5 text-left font-semibold">Organization</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Type</th>
                  <th className="px-5 py-3.5 text-left font-semibold">File Name</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Upload Date</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Admin Status</th>
                  <th className="px-5 py-3.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-gray-100"}`}>
                {uploads.length > 0 ? (
                  uploads.map((item) => {
                    const status = item.status || STATUSES[0];
                    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[STATUSES[0]];
                    return (
                      <tr key={item.id} className={`transition ${darkMode ? cfg.barDark : cfg.bar}`}>
                        <td className={`px-5 py-4 text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                          {item.organization}
                        </td>
                        <td className={`px-5 py-4 text-sm ${darkMode ? "text-slate-300" : "text-gray-600"}`}>
                          {item.documentType || "By-laws"}
                        </td>
                        <td className={`px-5 py-4 text-sm max-w-[200px] ${darkMode ? "text-slate-300" : "text-gray-600"}`}>
                          <span className="flex items-center gap-1.5 truncate" title={item.fileName}>
                            <span className={`shrink-0 ${darkMode ? "text-slate-500" : "text-gray-400"}`}>📄</span>
                            {item.fileName}
                          </span>
                        </td>
                        <td className={`px-5 py-4 text-sm ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                          {item.uploadedAt?.seconds
                            ? new Date(item.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                                year: "numeric", month: "short", day: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                                darkMode ? cfg.badgeDark : cfg.badge
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                              {cfg.icon} {status}
                            </span>
                            <p className={`text-xs pl-1 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>{cfg.message}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center gap-2">
                            <a
                              href={item.fileURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition"
                            >
                              View
                            </a>
                            <button
                              onClick={() => openResubmitModal(item)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition"
                            >
                              Re-Submit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-16">
                      <div className={`flex flex-col items-center gap-2 ${darkMode ? "text-slate-500" : "text-gray-400"}`}>
                        <span className="text-5xl">📂</span>
                        <p className={`font-semibold ${darkMode ? "text-slate-300" : "text-gray-500"}`}>No uploaded documents yet</p>
                        <p className="text-sm">Upload a document to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className={`sm:hidden divide-y ${darkMode ? "divide-slate-800" : "divide-gray-100"}`}>
            {uploads.length > 0 ? (
              uploads.map((item) => {
                const status = item.status || STATUSES[0];
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[STATUSES[0]];
                return (
                  <div key={item.id} className={`p-4 space-y-3 ${darkMode ? cfg.barDark : cfg.bar}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className={`font-semibold text-sm ${darkMode ? "text-white" : "text-gray-800"}`}>{item.organization}</p>
                        <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>{item.documentType || "By-laws"}</p>
                        <p className={`text-xs mt-0.5 truncate max-w-[200px] ${darkMode ? "text-slate-400" : "text-gray-500"}`}>{item.fileName}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          darkMode ? cfg.badgeDark : cfg.badge
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                        {cfg.icon} {status}
                      </span>
                    </div>
                    <p className={`text-xs italic ${darkMode ? "text-slate-400" : "text-gray-500"}`}>{cfg.message}</p>
                    <p className={`text-xs ${darkMode ? "text-slate-500" : "text-gray-400"}`}>
                      Uploaded:{" "}
                      {item.uploadedAt?.seconds
                        ? new Date(item.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                            year: "numeric", month: "short", day: "numeric",
                          })
                        : "—"}
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={item.fileURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold transition"
                      >
                        View
                      </a>
                      <button
                        onClick={() => openResubmitModal(item)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-xs font-semibold transition"
                      >
                        Re-Submit
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={`text-center py-16 ${darkMode ? "text-slate-500" : "text-gray-400"}`}>
                <span className="text-5xl block mb-2">📂</span>
                <p className={`font-semibold ${darkMode ? "text-slate-300" : "text-gray-500"}`}>No uploaded documents yet</p>
                <p className="text-sm">Upload a document to get started.</p>
              </div>
            )}
          </div>

          {uploads.length > 0 && (
            <div className={`px-5 py-3 border-t text-xs ${darkMode ? "border-slate-800 text-slate-500" : "border-gray-100 text-gray-400"}`}>
              Showing {uploads.length} submission{uploads.length !== 1 ? "s" : ""} · Updates automatically when admin reviews
            </div>
          )}
        </div>
      </div>

      {/* Attendance Records Modal */}
      <RecordsModal
        isOpen={showRecords}
        onClose={() => setShowRecords(false)}
        darkMode={darkMode}
      />

      {/* Re-Submit Modal */}
      {resubmitModalOpen && resubmitItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && !resubmitting && setResubmitModalOpen(false)}
        >
          <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ${darkMode ? "bg-slate-900" : "bg-white"}`}>
            <div className="bg-pink-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Re-Submit Document</h2>
              <button
                onClick={() => !resubmitting && setResubmitModalOpen(false)}
                className="text-pink-200 hover:text-white text-xl font-bold leading-none"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                  Organization
                </p>
                <p className={`font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>{resubmitItem.organization}</p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                  Document Type
                </p>
                <p className={`text-sm ${darkMode ? "text-slate-200" : "text-gray-700"}`}>{resubmitItem.documentType || "By-laws"}</p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                  Current File
                </p>
                <p className={`text-sm truncate ${darkMode ? "text-slate-200" : "text-gray-700"}`}>{resubmitItem.fileName}</p>
              </div>

              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                  New PDF File
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResubmitFile(e.target.files?.[0] ?? null)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm cursor-pointer outline-none transition file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:font-semibold file:text-xs ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-slate-200 file:bg-pink-500/20 file:text-pink-300 hover:file:bg-pink-500/30"
                      : "border-gray-200 file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200"
                  }`}
                />
                <p className={`text-xs mt-2 flex items-center gap-1 ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                  <span>📄</span> PDF only · 
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setResubmitModalOpen(false)}
                  disabled={resubmitting}
                  className={`flex-1 border-2 font-semibold py-2.5 rounded-xl transition text-sm disabled:opacity-60 ${
                    darkMode
                      ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResubmit}
                  disabled={resubmitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resubmitting ? "Submitting..." : "Re-Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          // NEW: can't be dismissed while a password change is required
          onClick={(e) => e.target === e.currentTarget && !mustChangePassword && setProfileModalOpen(false)}
        >
          <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col ${darkMode ? "bg-slate-900" : "bg-white"}`}>
            <div className="bg-pink-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-white font-bold text-lg">My Profile</h2>
              {/* NEW: close button is hidden while a password change is required */}
              {!mustChangePassword && (
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="text-pink-200 hover:text-white text-xl font-bold leading-none"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto">
              {/* NEW: required-password-change banner */}
              {mustChangePassword && (
                <div
                  role="alert"
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                    darkMode
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <span className="text-lg leading-none">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold">Password change required</p>
                    <p className="text-xs mt-0.5">
                      Your account is using a default password. Please set a new password below before you can use the other features.
                    </p>
                  </div>
                </div>
              )}

              {profileLoading ? (
                <div className="flex items-center justify-center py-10 text-pink-400 font-medium">
                  <svg className="animate-spin w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading profile…
                </div>
              ) : profileError ? (
                <p className={`text-sm ${darkMode ? "text-red-300" : "text-red-600"}`}>{profileError}</p>
              ) : profileData ? (
                <>
                  {/* Account details */}
                  <div className="space-y-3">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                      Account Details
                    </p>

                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          darkMode ? "bg-pink-500/15 text-pink-300" : "bg-pink-100 text-pink-700"
                        }`}
                      >
                        {`${profileData.firstName?.[0] || ""}${profileData.lastName?.[0] || ""}`.toUpperCase() ||
                          (profileData.username || "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                          {[profileData.firstName, profileData.middleName, profileData.lastName]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </p>
                        <p className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                          @{profileData.username || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className={`text-xs ${darkMode ? "text-slate-500" : "text-gray-400"}`}>Student ID</p>
                        <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                          {profileData.studentId || "—"}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${darkMode ? "text-slate-500" : "text-gray-400"}`}>Position</p>
                        <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                          {profileData.position || "—"}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${darkMode ? "text-slate-500" : "text-gray-400"}`}>Role</p>
                        <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                          {profileData.role || "—"}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${darkMode ? "text-slate-500" : "text-gray-400"}`}>Status</p>
                        <p className={`text-sm font-medium flex items-center gap-1.5 ${darkMode ? "text-white" : "text-gray-800"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${profileData.status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {profileData.status || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Change password */}
                  <div className="space-y-3 pt-2 border-t border-dashed border-gray-300/40">
                    <p className={`text-xs font-semibold uppercase tracking-wide pt-3 ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
                      Change Password
                    </p>


                    {passwordMsg && (
                      <p className={`text-xs font-medium ${passwordMsg.type === "error" ? (darkMode ? "text-red-300" : "text-red-600") : (darkMode ? "text-green-300" : "text-green-600")}`}>
                        {passwordMsg.text}
                      </p>
                    )}

                    <input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition ${inputClass}`}
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition ${inputClass}`}
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition ${inputClass}`}
                    />

                    <button
                      onClick={handleChangePassword}
                      disabled={passwordSaving}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2.5 rounded-xl transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {passwordSaving ? "Saving..." : "Update Password"}
                    </button>

                    {/* NEW: so the user isn't trapped in the locked modal */}
                    {mustChangePassword && (
                      <button
                        onClick={handleLogout}
                        className={`w-full border-2 font-semibold py-2.5 rounded-xl transition text-sm ${
                          darkMode
                            ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Log out
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* RECORDS MODAL (view logged-in user's own attendance records)            */
/* ---------------------------------------------------------------------- */

export function RecordsModal({ isOpen, onClose, darkMode }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

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

      return null;
    };

    const fetchRecords = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const uid = getLoggedInUid();
        if (!uid) {
          throw new Error("No logged-in user found. Please log in again.");
        }

        const recordsQuery = query(
          collection(db, "attendance"),
          where("userId", "==", uid)
        );
        const snap = await getDocs(recordsQuery);

        let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Attach session title / event date for display, without
        // touching how attendance docs themselves are read or written.
        const sessionIds = [...new Set(data.map((r) => r.sessionId).filter(Boolean))];
        const sessionMap = {};
        await Promise.all(
          sessionIds.map(async (sid) => {
            try {
              const sSnap = await getDoc(doc(db, "sessions", sid));
              if (sSnap.exists()) sessionMap[sid] = sSnap.data();
            } catch {
              // ignore individual session fetch errors
            }
          })
        );

        data = data.map((r) => ({
          ...r,
          sessionTitle: sessionMap[r.sessionId]?.title || "Unknown Session",
          eventDate: sessionMap[r.sessionId]?.eventDate || null,
        }));

        // Most recent first
        data.sort((a, b) => {
          const ta = a.timeIn?.toMillis ? a.timeIn.toMillis() : 0;
          const tb = b.timeIn?.toMillis ? b.timeIn.toMillis() : 0;
          return tb - ta;
        });

        if (isMounted) setRecords(data);
      } catch (err) {
        console.error("Failed to fetch records:", err);
        if (isMounted) setFetchError(err.message || "Failed to load records.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecords();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const cardBg = darkMode ? "bg-gray-900" : "bg-white";
  const textPrimary = darkMode ? "text-gray-100" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-500";
  const borderColor = darkMode ? "border-gray-700" : "border-pink-100";
  const sectionBg = darkMode ? "bg-gray-800" : "bg-pink-50";

  const formatEventDate = (value) => {
    if (!value) return "—";
    const [y, m, d] = value.split("-");
    return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (ts) => {
    if (!ts) return "—";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/50 backdrop-blur-sm transition-opacity duration-200 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border ${borderColor} ${cardBg} transition-all duration-200 animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 border-b ${borderColor} ${cardBg}`}>
          <h2 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${textPrimary}`}>
            <Clock className="w-5 h-5 text-pink-500" />
            My Attendance Records
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition ${darkMode ? "hover:bg-gray-800" : "hover:bg-pink-50"}`}
            aria-label="Close"
          >
            <FiX className={textPrimary} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
              <p className={`text-sm ${textSecondary}`}>Loading records...</p>
            </div>
          )}

          {!loading && fetchError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              <span>{fetchError}</span>
            </div>
          )}

          {!loading && !fetchError && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Clock className={`w-8 h-8 ${darkMode ? "text-pink-500/40" : "text-pink-300"}`} />
              <p className={`text-sm font-medium ${textPrimary}`}>No attendance records yet</p>
              <p className={`text-xs ${textSecondary}`}>
                Records will appear here after you scan an attendance QR code.
              </p>
            </div>
          )}

          {!loading && !fetchError && records.length > 0 && (
            <div className="space-y-3">
              {records.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-xl border ${borderColor} ${sectionBg} p-4 space-y-2`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-semibold text-sm truncate ${textPrimary}`}>
                      {r.sessionTitle}
                    </span>
                    <span className={`text-xs flex-shrink-0 ${textSecondary}`}>
                      {formatEventDate(r.eventDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-1 border-t border-pink-100/60">
                    <span className={textSecondary}>Time In</span>
                    <span className={`font-semibold ${textPrimary}`}>{formatTime(r.timeIn)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={textSecondary}>Time Out</span>
                    <span className={`font-semibold ${textPrimary}`}>{formatTime(r.timeOut)}</span>
                  </div>
                </div>
              ))}
            </div>
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

/* ---------------------------------------------------------------------- */
/* SCAN VIEW (camera + jsQR)                                               */
/* ---------------------------------------------------------------------- */

export function ScanView({ onBack, onDecoded }) {
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

export function ConfirmView({ payload, onScanAgain, onDone }) {
  const [status, setStatus] = useState("processing"); // processing | success | error | already
  const [message, setMessage] = useState("");
  const [record, setRecord] = useState(null);

  useEffect(() => {
    recordAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordAttendance = async () => {
    const { sessionId } = payload;

    const userData = JSON.parse(sessionStorage.getItem("userData"));
    const uid =
      userData?.uid ||
      userData?.id ||
      sessionStorage.getItem("uid") ||
      null;

    if (!userData || !uid) {
      setStatus("error");
      setMessage("Not logged in.");
      return;
    }

    try {
      // Deterministic, per-officer, per-session doc id (sessionId_uid).
      // This guarantees each officer only ever reads/writes THEIR OWN
      // attendance record for THIS session — no query race, no chance
      // that one officer's scan updates a different officer's
      // timeIn/timeOut, even if several officers scan on different
      // devices at the same time. The read + write happen inside a
      // Firestore transaction so the check-then-write is atomic.
      const attendanceDocId = `${sessionId}_${uid}`;
      const attendanceRef = doc(db, "attendance", attendanceDocId);

      const result = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(attendanceRef);

        // CASE 1: NO RECORD → TIME IN
        if (!snap.exists()) {
          transaction.set(attendanceRef, {
            sessionId,
            userId: uid,
            studentId: userData.studentId || "",
            studentName: `${userData.firstName} ${userData.lastName}`,
            position: userData.position,
            role: userData.role,
            timeIn: serverTimestamp(),
            timeOut: null,
            createdAt: serverTimestamp(),
          });
          return { type: "timein" };
        }

        const data = snap.data();

        // Ownership guard: don't rely on uid alone. The doc id already
        // encodes sessionId+uid, but if two different officers were ever
        // to resolve to the same uid upstream (stale/shared session data,
        // login bug, etc.), a uid-only check would silently treat them as
        // the same person and let one officer's scan mutate another
        // officer's record. Cross-check against studentId too — it's
        // effectively impossible for two different officers to share both.
        const sameOwner =
          data.userId === uid &&
          (!userData.studentId || data.studentId === userData.studentId);

        if (!sameOwner) {
          return { type: "mismatch" };
        }

        // CASE 2: ALREADY TIMED OUT
        if (data.timeOut) {
          return { type: "already" };
        }

        // CASE 3: EXISTING RECORD → TIME OUT
        transaction.update(attendanceRef, {
          timeOut: serverTimestamp(),
        });
        return { type: "timeout" };
      });

      if (result.type === "mismatch") {
        setStatus("error");
        setMessage("Attendance record mismatch. Please try again.");
        return;
      }

      if (result.type === "already") {
        setStatus("already");
        setMessage("Already timed out.");
        return;
      }

      setStatus("success");
      setMessage(
        result.type === "timein"
          ? "Time-in recorded successfully."
          : "Time-out recorded successfully."
      );
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