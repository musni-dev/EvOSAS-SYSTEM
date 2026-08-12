import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUserCircle,
  FaCheckCircle,
  FaExclamationCircle,
  FaExchangeAlt,
  FaEnvelope,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";

// Writes a log entry in the exact shape AuditTrailPage.jsx reads:
// { action, module, documentTitle, documentId, performedBy, description,
//   timestamp, oldData?, newData? }
async function writeAuditLog({ currentUser, action, description, extra = {} }) {
  const roleValue = localStorage.getItem("role") || "Administrator";
  let storedUserData = {};
  try {
    storedUserData = JSON.parse(localStorage.getItem("userData") || "{}");
  } catch {
    storedUserData = {};
  }
  const name =
    currentUser?.displayName ||
    [storedUserData.firstName, storedUserData.lastName]
      .filter(Boolean)
      .join(" ") ||
    currentUser?.email ||
    "Administrator";

  await addDoc(collection(db, "auditTrail"), {
    action,
    module: "Authentication",
    documentTitle: currentUser?.email || "",
    documentId: currentUser?.uid || "",
    performedBy: {
      name,
      email: currentUser?.email || "",
      role: roleValue,
      photoURL: currentUser?.photoURL || "",
    },
    description,
    timestamp: serverTimestamp(),
    ...extra,
  });
}

export default function ProfilePage({ darkMode }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "success" | "error", message: string }

  // Pull whatever we can about the signed-in admin for display purposes.
  const currentUser = auth.currentUser;
  let storedUserData = {};
  try {
    storedUserData = JSON.parse(localStorage.getItem("userData") || "{}");
  } catch {
    storedUserData = {};
  }

  const displayName =
    currentUser?.displayName ||
    [storedUserData.firstName, storedUserData.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Administrator";

  const displayEmail =
    currentUser?.email || storedUserData.username || "No email on file";

  const role = localStorage.getItem("role") || "Administrator";

  async function handleChangePassword(e) {
    e.preventDefault();
    setFeedback(null);

    if (!currentUser) {
      setFeedback({
        type: "error",
        message:
          "No active Firebase session found. Please log out and log back in to change your password.",
      });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedback({ type: "error", message: "Please fill in all fields." });
      return;
    }

    if (newPassword.length < 8) {
      setFeedback({
        type: "error",
        message: "New password must be at least 8 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "New password and confirmation do not match.",
      });
      return;
    }

    if (newPassword === currentPassword) {
      setFeedback({
        type: "error",
        message: "New password must be different from your current password.",
      });
      return;
    }

    setLoading(true);

    try {
      // Firebase requires a recent login before allowing a password change,
      // so we re-authenticate with the current password first.
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      await updatePassword(currentUser, newPassword);

      // ---- AUDIT TRAIL: password change ----
      try {
        await writeAuditLog({
          currentUser,
          action: "Changed Password",
          description: `${currentUser.email} changed their own account password.`,
        });
      } catch (auditErr) {
        // Don't block the user-facing success flow if audit logging fails,
        // but make sure it's visible in the console for debugging.
        console.error("Audit log error (password change):", auditErr);
      }

      setFeedback({
        type: "success",
        message: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Password change error:", err);

      let message = "Something went wrong. Please try again.";
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        message = "Your current password is incorrect.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many attempts. Please wait a moment and try again.";
      } else if (err.code === "auth/weak-password") {
        message = "Please choose a stronger password.";
      }

      setFeedback({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile summary card */}
        <div
          className={`rounded-2xl shadow-sm p-6 flex items-center gap-4 ${
            darkMode
              ? "bg-gray-900 border border-gray-800"
              : "bg-white/70 backdrop-blur-xl border border-white/40"
          }`}
        >
          <div
            className={`rounded-full p-3 ${
              darkMode ? "bg-gray-800 text-pink-400" : "bg-pink-50 text-pink-500"
            }`}
          >
            <FaUserCircle size={40} />
          </div>
          <div>
            <h2
              className={`text-lg font-bold ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {displayName}
            </h2>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {displayEmail}
            </p>
            <span
              className={`inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                darkMode ? "bg-pink-500/20 text-pink-400" : "bg-pink-100 text-pink-600"
              }`}
            >
              {role}
            </span>
          </div>
        </div>

        {/* Change password card */}
        <div
          className={`rounded-2xl shadow-sm p-6 sm:p-8 ${
            darkMode
              ? "bg-gray-900 border border-gray-800"
              : "bg-white/70 backdrop-blur-xl border border-white/40"
          }`}
        >
          <h3
            className={`text-base font-bold mb-1 ${
              darkMode ? "text-white" : "text-gray-800"
            }`}
          >
            Change Password
          </h3>
          <p className={`text-sm mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Update the password used to sign in to your account.
          </p>

          {feedback && (
            <div
              className={`flex items-start gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-medium ${
                feedback.type === "success"
                  ? darkMode
                    ? "bg-green-500/10 text-green-400"
                    : "bg-green-50 text-green-700"
                  : darkMode
                  ? "bg-red-500/10 text-red-400"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {feedback.type === "success" ? (
                <FaCheckCircle className="mt-0.5 shrink-0" size={14} />
              ) : (
                <FaExclamationCircle className="mt-0.5 shrink-0" size={14} />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            <PasswordField
              id="current-password"
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggleShow={() => setShowCurrent((v) => !v)}
              darkMode={darkMode}
              placeholder="Enter your current password"
            />

            <PasswordField
              id="new-password"
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggleShow={() => setShowNew((v) => !v)}
              darkMode={darkMode}
              placeholder="At least 8 characters"
            />

            <PasswordField
              id="confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggleShow={() => setShowConfirm((v) => !v)}
              darkMode={darkMode}
              placeholder="Re-enter your new password"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-pink-500 to-pink-400 shadow-md shadow-pink-400/30 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* =====================================================
            TRANSFER ADMIN AUTHORITY - START
            (New feature. Nothing above this was modified except
            the audit-trail call inside handleChangePassword.)
        ===================================================== */}
        <TransferAdminAuthority darkMode={darkMode} currentUser={currentUser} />
        {/* =====================================================
            TRANSFER ADMIN AUTHORITY - END
        ===================================================== */}
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  darkMode,
  placeholder,
}) {
  return (
    <div className="space-y-1.5 text-left">
      <label
        htmlFor={id}
        className={`text-xs font-bold pl-0.5 ${
          darkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {label}
      </label>
      <div className="relative">
        <FaLock
          className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500"
          size={13}
        />
        <input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-11 pr-11 py-3 rounded-xl border-2 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-pink-500/15 focus:border-pink-500 transition-all duration-200 ${
            darkMode
              ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
          }`}
          required
        />
        {value && (
          <button
            type="button"
            onClick={onToggleShow}
            aria-label={show ? "Hide password" : "Show password"}
            className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
              darkMode
                ? "text-gray-500 hover:text-pink-400"
                : "text-gray-400 hover:text-pink-500"
            }`}
          >
            {show ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   NEW COMPONENT: TransferAdminAuthority
   Self-contained. Does not touch any state/logic above.
========================================================= */
function TransferAdminAuthority({ darkMode, currentUser }) {
  const [transferCurrentPassword, setTransferCurrentPassword] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [confirmTempPassword, setConfirmTempPassword] = useState("");

  const [showTransferCurrent, setShowTransferCurrent] = useState(false);
  const [showTemp, setShowTemp] = useState(false);
  const [showConfirmTemp, setShowConfirmTemp] = useState(false);

  const [transferLoading, setTransferLoading] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState(null); // { type, message }
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Only DCT email addresses are allowed to receive admin authority.
  const ALLOWED_DOMAIN = "dct.edu.ph";

  function resetTransferForm() {
    setTransferCurrentPassword("");
    setNewAdminEmail("");
    setTempPassword("");
    setConfirmTempPassword("");
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Checks that the email's domain is exactly ALLOWED_DOMAIN
  // (case-insensitive), e.g. "someone@dct.edu.ph" passes,
  // "someone@notdct.edu.ph" or "someone@dct.edu.ph.fake.com" do not.
  function isAllowedDomain(email) {
    const parts = email.trim().toLowerCase().split("@");
    if (parts.length !== 2) return false;
    return parts[1] === ALLOWED_DOMAIN;
  }

  function friendlyFirebaseError(err) {
    switch (err?.code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Your current password is incorrect.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/email-already-in-use":
        return "An account with that email already exists.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Temporary password is too weak. Please choose a stronger one.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      case "auth/requires-recent-login":
        return "For security, please re-enter your current password and try again.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in isn't enabled for this project, or this action was blocked by your Firebase project's Authentication settings.";
      default:
        return "Something went wrong. Please try again.";
    }
  }

  // Step 1: validation, then open confirmation modal.
  function handleTransferClick(e) {
    e.preventDefault();
    setTransferFeedback(null);

    if (!currentUser) {
      setTransferFeedback({
        type: "error",
        message:
          "No active Firebase session found. Please log out and log back in.",
      });
      return;
    }

    if (
      !transferCurrentPassword ||
      !newAdminEmail ||
      !tempPassword ||
      !confirmTempPassword
    ) {
      setTransferFeedback({ type: "error", message: "Please fill in all fields." });
      return;
    }

    if (!validateEmail(newAdminEmail)) {
      setTransferFeedback({
        type: "error",
        message: "Please enter a valid email address for the new admin.",
      });
      return;
    }

    if (!isAllowedDomain(newAdminEmail)) {
      setTransferFeedback({
        type: "error",
        message: `The new admin email must be a ${ALLOWED_DOMAIN} address.`,
      });
      return;
    }

    if (
      newAdminEmail.trim().toLowerCase() ===
      (currentUser.email || "").trim().toLowerCase()
    ) {
      setTransferFeedback({
        type: "error",
        message: "You cannot transfer authority to your own email address.",
      });
      return;
    }

    if (tempPassword.length < 8) {
      setTransferFeedback({
        type: "error",
        message: "Temporary password must be at least 8 characters long.",
      });
      return;
    }

    if (tempPassword !== confirmTempPassword) {
      setTransferFeedback({
        type: "error",
        message: "Temporary passwords do not match.",
      });
      return;
    }

    setShowConfirmModal(true);
  }

  // Step 2 onward: actual transfer, run after modal confirmation.
  // NOTE ON HOW THIS WORKS NOW:
  // Firebase deprecated updateEmail() for projects with Email Enumeration
  // Protection enabled (default for all new Firebase projects) and throws
  // auth/operation-not-allowed if you call it directly. The supported
  // replacement is verifyBeforeUpdateEmail(), which sends a confirmation
  // link to the NEW email address — the Auth email only actually changes
  // once that link is clicked. It can't be made instant; that's enforced
  // by Firebase/Google, not something you can turn off in this code.
  //
  // To still satisfy "old admin loses access immediately," we change the
  // password to the temporary password right away in this same step —
  // the old admin's old password stops working immediately, even though
  // the email swap itself completes once the new admin verifies.
  async function performTransfer() {
    setShowConfirmModal(false);
    setTransferLoading(true);
    setTransferFeedback(null);

    const oldAdminEmail = currentUser.email;
    const uid = currentUser.uid;
    const trimmedNewEmail = newAdminEmail.trim();

    try {
      // --- Step 2: re-authenticate current admin ---
      const credential = EmailAuthProvider.credential(
        oldAdminEmail,
        transferCurrentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // --- Security: prevent transferring to an email already used by
      // another account in Firestore ---
      const usersRef = collection(db, "users");
      const dupQuery = query(usersRef, where("email", "==", trimmedNewEmail));
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        setTransferFeedback({
          type: "error",
          message: "An account with that email already exists.",
        });
        setTransferLoading(false);
        return;
      }

      // --- Step 3: send verification link to the NEW email ---
      // The Auth email does not change yet — it changes only once the
      // new admin opens their inbox and clicks the link.
      await verifyBeforeUpdateEmail(currentUser, trimmedNewEmail);

      // --- Step 3b: set the temporary password on this SAME account,
      // immediately — this is what actually locks the old admin out now ---
      await updatePassword(currentUser, tempPassword);

      // --- Step 4/5: mark the SAME Firestore doc as pending transfer.
      // Using setDoc(..., { merge: true }) instead of updateDoc() so this
      // doesn't fail even if a doc at users/{uid} doesn't already exist —
      // it creates it if missing, or merges these fields in if it does,
      // without touching any other existing fields. We don't overwrite
      // `email` yet since the Auth email hasn't actually changed — only
      // the pending fields, so nothing in the rest of the app mistakenly
      // treats the swap as done. ---
      await setDoc(
        doc(db, "users", uid),
        {
          pendingTransferEmail: trimmedNewEmail,
          transferInitiatedAt: serverTimestamp(),
          transferStatus: "pending_verification",
        },
        { merge: true }
      );

      // --- Step 6: audit trail ---
      try {
        await writeAuditLog({
          currentUser,
          action: "Initiated Admin Transfer",
          description: `Administrator authority transfer initiated from ${oldAdminEmail} to ${trimmedNewEmail}. Pending the new admin's email verification.`,
          extra: {
            oldData: { email: oldAdminEmail },
            newData: { email: trimmedNewEmail },
          },
        });
      } catch (auditErr) {
        console.error("Audit log error (admin transfer):", auditErr);
      }

      resetTransferForm();
      setShowSuccessModal(true);

      // --- Step 7: sign out current admin and redirect ---
      // Old password no longer works, so this genuinely ends their access.
      localStorage.setItem(
        "postTransferMessage",
        "A verification link was sent to the new administrator's email. Once they click it and log in with the temporary password, the transfer will be complete."
      );

      setTimeout(async () => {
        await signOut(auth);
        window.location.href = "/login";
      }, 2500);
    } catch (err) {
      console.error("Admin transfer error:", err);
      setTransferFeedback({ type: "error", message: friendlyFirebaseError(err) });
    } finally {
      setTransferLoading(false);
    }
  }

  return (
    <div
      className={`rounded-2xl shadow-sm p-6 sm:p-8 ${
        darkMode
          ? "bg-gray-900 border border-gray-800"
          : "bg-white/70 backdrop-blur-xl border border-white/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <FaExchangeAlt className="text-pink-500" size={16} />
        <h3
          className={`text-base font-bold ${
            darkMode ? "text-white" : "text-gray-800"
          }`}
        >
          Transfer Admin Authority
        </h3>
      </div>
      <p className={`text-sm mb-6 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        Transfer the administrator privileges to another email address. After
        the transfer, the current administrator will immediately lose
        administrator access.
      </p>

      {transferFeedback && (
        <div
          className={`flex items-start gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-medium ${
            transferFeedback.type === "success"
              ? darkMode
                ? "bg-green-500/10 text-green-400"
                : "bg-green-50 text-green-700"
              : darkMode
              ? "bg-red-500/10 text-red-400"
              : "bg-red-50 text-red-600"
          }`}
        >
          {transferFeedback.type === "success" ? (
            <FaCheckCircle className="mt-0.5 shrink-0" size={14} />
          ) : (
            <FaExclamationCircle className="mt-0.5 shrink-0" size={14} />
          )}
          <span>{transferFeedback.message}</span>
        </div>
      )}

      <form onSubmit={handleTransferClick} className="space-y-5">
        <PasswordField
          id="transfer-current-password"
          label="Current Password"
          value={transferCurrentPassword}
          onChange={setTransferCurrentPassword}
          show={showTransferCurrent}
          onToggleShow={() => setShowTransferCurrent((v) => !v)}
          darkMode={darkMode}
          placeholder="Confirm it's you"
        />

        <div className="space-y-1.5 text-left">
          <label
            htmlFor="new-admin-email"
            className={`text-xs font-bold pl-0.5 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            New Admin Email
          </label>
          <div className="relative">
            <FaEnvelope
              className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500"
              size={13}
            />
            <input
              id="new-admin-email"
              type="email"
              placeholder="newadmin@dct.edu.ph"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-pink-500/15 focus:border-pink-500 transition-all duration-200 ${
                darkMode
                  ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
              }`}
              required
            />
          </div>
          <p
            className={`text-[11px] pl-0.5 ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Only @{ALLOWED_DOMAIN} email addresses can receive admin authority.
          </p>
        </div>

        <PasswordField
          id="temp-password"
          label="Temporary Password"
          value={tempPassword}
          onChange={setTempPassword}
          show={showTemp}
          onToggleShow={() => setShowTemp((v) => !v)}
          darkMode={darkMode}
          placeholder="At least 8 characters"
        />

        <PasswordField
          id="confirm-temp-password"
          label="Confirm Temporary Password"
          value={confirmTempPassword}
          onChange={setConfirmTempPassword}
          show={showConfirmTemp}
          onToggleShow={() => setShowConfirmTemp((v) => !v)}
          darkMode={darkMode}
          placeholder="Re-enter the temporary password"
        />

        {/* Warning box */}
        <div
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            darkMode
              ? "bg-yellow-500/10 text-yellow-400"
              : "bg-yellow-50 text-yellow-700"
          }`}
        >
          <FaExclamationTriangle className="mt-0.5 shrink-0" size={14} />
          <span>
            This action permanently transfers administrator authority to
            another account. After confirmation, the current administrator
            will no longer be able to access the administrator dashboard.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={transferLoading}
            onClick={() => {
              resetTransferForm();
              setTransferFeedback(null);
            }}
            className={`w-full sm:w-1/2 py-3.5 rounded-xl font-bold text-sm border-2 transition-all duration-200 disabled:opacity-50 ${
              darkMode
                ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={transferLoading}
            className="w-full sm:w-1/2 py-3.5 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-red-500 to-red-400 shadow-md shadow-red-400/30 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {transferLoading ? "Transferring..." : "Transfer Authority"}
          </button>
        </div>
      </form>

      {/* Confirmation modal */}
      {showConfirmModal && (
        <Modal darkMode={darkMode} onClose={() => setShowConfirmModal(false)}>
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`rounded-full p-2 shrink-0 ${
                darkMode ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500"
              }`}
            >
              <FaExclamationTriangle size={18} />
            </div>
            <div>
              <h4
                className={`font-bold text-base ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Confirm Admin Transfer
              </h4>
              <p
                className={`text-sm mt-1 ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                You are about to permanently transfer administrator authority
                to <span className="font-semibold">{newAdminEmail}</span>. You
                will immediately lose administrator access. This cannot be
                undone. Are you sure you want to continue?
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className={`w-full sm:w-1/2 py-3 rounded-xl font-bold text-sm border-2 transition-all duration-200 ${
                darkMode
                  ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={performTransfer}
              className="w-full sm:w-1/2 py-3 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-red-500 to-red-400 shadow-md shadow-red-400/30 hover:shadow-lg transition-all duration-200"
            >
              Yes, Transfer
            </button>
          </div>
        </Modal>
      )}

      {/* Success modal */}
      {showSuccessModal && (
        <Modal darkMode={darkMode} onClose={() => {}}>
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div
              className={`rounded-full p-3 ${
                darkMode
                  ? "bg-green-500/10 text-green-400"
                  : "bg-green-50 text-green-600"
              }`}
            >
              <FaCheckCircle size={28} />
            </div>
            <h4
              className={`font-bold text-base ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              Verification link sent to the new admin.
            </h4>
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              The new administrator must open their email and click the
              verification link to finish the transfer, then log in using
              the temporary password. You've been signed out and will be
              redirected to the login page.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* Simple reusable modal shell used only by TransferAdminAuthority */
function Modal({ darkMode, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-xl p-6 ${
          darkMode ? "bg-gray-900 border border-gray-800" : "bg-white"
        }`}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`absolute top-4 right-4 ${
              darkMode
                ? "text-gray-500 hover:text-gray-300"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <FaTimes size={14} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}