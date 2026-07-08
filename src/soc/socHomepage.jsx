import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import bcrypt from "bcryptjs";

const DOCUMENT_TYPES = ["Profile", "Accomplishment Report", "By-laws"];

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

  // Re-submit modal state
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitItem, setResubmitItem] = useState(null);
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);

  // Profile modal state
  // NOTE: the logged-in user's Firestore document ID ("uid") in the
  // "users" collection is saved to localStorage at login time under the key "uid".
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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("acceptedTerms");
    localStorage.removeItem("uid");
    localStorage.removeItem("role");
    localStorage.removeItem("userData");
    navigate("/login");
  };

  // ---- DATA ISOLATION FIX ----
  // Before: this query had no "where" clause, so every SOC account's
  // onSnapshot listener pulled ALL documents from "organization_bylaws",
  // regardless of who uploaded them — that's why every account saw every file.
  //
  // Fix: only load documents whose "uploadedBy" field matches the currently
  // logged-in user's uid (the same uid saved to localStorage at login,
  // see Login.jsx -> localStorage.setItem("uid", foundUser.id)).
  useEffect(() => {
    const uid = localStorage.getItem("uid");

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
    const uid = localStorage.getItem("uid");
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
    const uid = localStorage.getItem("uid");
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

    const uid = localStorage.getItem("uid");
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
        updatedAt: serverTimestamp(),
      });

      setProfileData((p) => ({ ...p, password: hashedPassword }));
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

  const cardClass = darkMode
    ? "bg-slate-900 border border-slate-700"
    : "bg-white border border-gray-100";

  const inputClass = darkMode
    ? "border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:ring-2 focus:ring-pink-500/30"
    : "border-gray-200 bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-pink-400";

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
                  Upload File
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
                disabled={loading}
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
          onClick={(e) => e.target === e.currentTarget && setProfileModalOpen(false)}
        >
          <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col ${darkMode ? "bg-slate-900" : "bg-white"}`}>
            <div className="bg-pink-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-white font-bold text-lg">My Profile</h2>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="text-pink-200 hover:text-white text-xl font-bold leading-none"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto">
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