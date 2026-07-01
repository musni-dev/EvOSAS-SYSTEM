// ============================================================
//  auditTrail.js  —  EVOSAS Audit Trail Helper
//  Usage: import { logAudit } from "../../utils/auditTrail";
//  Call this inside every CRUD handler AFTER the Firestore op.
// ============================================================

import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase"; // ← adjust path if needed

// ─── Browser / device fingerprint ───────────────────────────
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";

  const isMobile = /Mobi|Android/i.test(ua);
  const device = isMobile ? "Mobile" : "Desktop";

  return { browser, device };
};

// ─── Core log writer ────────────────────────────────────────
/**
 * logAudit — Write a single immutable record to auditTrail collection.
 *
 * @param {object} params
 * @param {string}  params.action        — e.g. "Added Case", "Deleted User"
 * @param {string}  params.module        — e.g. "Cases", "Lost & Found", "Users"
 * @param {string}  [params.documentId]  — Firestore document ID affected
 * @param {string}  [params.documentTitle] — Human-readable title e.g. "CASE-0000021"
 * @param {object}  params.performedBy   — { uid, name, email, role, department, photoURL? }
 * @param {object}  [params.oldData]     — Snapshot before edit
 * @param {object}  [params.newData]     — Snapshot after edit
 * @param {string}  [params.description] — Free-text detail
 */
export const logAudit = async ({
  action,
  module,
  documentId = "",
  documentTitle = "",
  performedBy = {},
  oldData = null,
  newData = null,
  description = "",
}) => {
  try {
    const { browser, device } = getDeviceInfo();

    await addDoc(collection(db, "auditTrail"), {
      action,
      module,
      documentId,
      documentTitle,
      performedBy: {
        uid: performedBy.uid || "",
        name: performedBy.name || "Unknown",
        email: performedBy.email || "",
        role: performedBy.role || "",
        department: performedBy.department || "",
        photoURL: performedBy.photoURL || "",
      },
      oldData: oldData ?? null,
      newData: newData ?? null,
      description,
      browser,
      device,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Silently fail — never block the main operation
    console.warn("[AuditTrail] Failed to write log:", err);
  }
};

// ─── Login / Logout helpers ─────────────────────────────────
/**
 * logLogin — Call immediately after a successful Firebase sign-in.
 * Also updates the user's lastLogin field in the "users" collection.
 *
 * @param {object} user  — Firebase Auth user object
 * @param {object} meta  — { role, department, name } from your Firestore user doc
 */
export const logLogin = async (user, meta = {}) => {
  try {
    // Update lastLogin on the user document
    await updateDoc(doc(db, "users", user.uid), {
      lastLogin: serverTimestamp(),
    });
  } catch (_) {
    // user doc might not exist yet — ignore
  }

  await logAudit({
    action: "Logged In",
    module: "Authentication",
    documentId: user.uid,
    documentTitle: meta.name || user.displayName || user.email,
    performedBy: {
      uid: user.uid,
      name: meta.name || user.displayName || "Unknown",
      email: user.email,
      role: meta.role || "",
      department: meta.department || "",
      photoURL: user.photoURL || "",
    },
    description: `User logged in successfully.`,
  });
};

/**
 * logLogout — Call before Firebase signOut().
 */
export const logLogout = async (user, meta = {}) => {
  await logAudit({
    action: "Logged Out",
    module: "Authentication",
    documentId: user?.uid || "",
    documentTitle: meta.name || user?.displayName || user?.email || "Unknown",
    performedBy: {
      uid: user?.uid || "",
      name: meta.name || user?.displayName || "Unknown",
      email: user?.email || "",
      role: meta.role || "",
      department: meta.department || "",
      photoURL: user?.photoURL || "",
    },
    description: `User logged out.`,
  });
};