import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "../../firebase/firebase";
import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUserCircle,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

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