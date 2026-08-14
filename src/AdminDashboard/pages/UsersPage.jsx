import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,} from "firebase/firestore";
import { Check, ChevronLeft, ChevronRight, Edit3, KeyRound, Plus, Search, ToggleLeft, ToggleRight, Trash2, UserPlus, X,} from "lucide-react";
import { db } from "../../firebase/firebase";
import bcrypt from "bcryptjs";
import { logAudit } from "../../utils/auditTrail";

// AUDIT TRAIL: reads the currently logged-in user (saved by Login.jsx) so
// every audit log entry records who actually performed the action.
const getCurrentUser = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("userData") || "{}");
    const name =
      [stored.firstName, stored.lastName].filter(Boolean).join(" ") ||
      stored.username ||
      "Administrator";

    return {
      uid: localStorage.getItem("uid") || stored.uid || "",
      name,
      email: stored.username || "",
      role: localStorage.getItem("role") || stored.role || "",
      department: stored.position || "",
      photoURL: stored.photoURL || "",
    };
  } catch {
    return {
      uid: localStorage.getItem("uid") || "",
      name: "Administrator",
      email: "",
      role: localStorage.getItem("role") || "",
      department: "",
      photoURL: "",
    };
  }
};

const USERS_COLLECTION = "users";
const PAGE_SIZE = 4;

const emptyForm = {
  studentId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  position: "",
  username: "",
  password: "",
  role: "",
  status: "Active",
};

// Full role list — still used for filtering/badges so existing Administrator
// accounts remain visible/searchable in the table.
const roles = [
  "Administrator",
  "SSC Officer",
  "Student Disciplinary Officer",
  "Student Organization Coordinator",
];

// Roles that can be assigned when creating/editing a user from this page.
// "Administrator" is intentionally excluded from here only.
const assignableRoles = roles.filter((role) => role !== "Administrator");

const positions = [
  "President",
  "Consultant",
  "Vice President - Internal",
  "Vice President - External",
  "Secretary-General",
  "Senator on Finance",
  "Senator on Public Information",
  "Senator on Student Welfare",
  "Executive Internal Associate",
  "Executive External Associate",
  "Executive Associate on Communications",
  "Executive Associate on Documentations",
  "Executive Associate on Documentations",
  "Executive Associate on Technical Support",
  "Executive Associate on Student Affairs",
];

const roleStyles = {
  Administrator: "bg-pink-100 text-pink-700 border-pink-200",
  "SSC Officer": "bg-rose-100 text-rose-700 border-rose-200",
  "Student Disciplinary Officer": "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "Student Organization Coordinator": "bg-purple-100 text-purple-700 border-purple-200",
};

const roleStylesDark = {
  Administrator: "bg-pink-500/10 text-pink-300 border-pink-500/30",
  "SSC Officer": "bg-rose-500/10 text-rose-300 border-rose-500/30",
  "Student Disciplinary Officer": "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30",
  "Student Organization Coordinator": "bg-purple-500/10 text-purple-300 border-purple-500/30",
};

const shortRole = {
  Administrator: "Admin",
  "SSC Officer": "SSC Officer",
  "Student Disciplinary Officer": "SDO",
  "Student Organization Coordinator": "SOC",
};

// Only letters and spaces allowed (no numbers, no special characters).
const NAME_CHARS_REGEX = /[^A-Za-z\s]/g;
const NAME_VALID_REGEX = /^[A-Za-z\s]+$/;

function sanitizeNameInput(value) {
  return value.replace(NAME_CHARS_REGEX, "");
}

function getNextDefaultPassword(users) {
  return "EvOSAS-2026";
}
function formatName(user) {
  return [user.firstName, user.middleName, user.lastName, user.suffix]
    .filter(Boolean)
    .join(" ");
}

function initialsOf(user) {
  const first = user.firstName?.trim()?.[0] || "";
  const last = user.lastName?.trim()?.[0] || "";
  const fallback = user.username?.slice(0, 2) || "U";
  return `${first}${last}`.toUpperCase() || fallback.toUpperCase();
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function normalizeUser(snapshotDoc) {
  const data = snapshotDoc.data();
  return {
    id: snapshotDoc.id,
    studentId: data.studentId || "",
    firstName: data.firstName || "",
    middleName: data.middleName || "",
    lastName: data.lastName || "",
    suffix: data.suffix || "",
    position: data.position || "",
    username: data.username || "",
    password: data.password || "",
    role: data.role || "",
    status: data.status || "Active",
    lastLoginAt: data.lastLoginAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    authUid: data.authUid || "",
  };
}

function Modal({ open, title, children, onClose, darkMode }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-3 py-6 sm:px-4">
      <div
        className={`max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border shadow-2xl ${
          darkMode
            ? "border-slate-700 bg-slate-900 shadow-black/60"
            : "border-pink-100 bg-white shadow-pink-200/60"
        }`}
      >
        <div
          className={`flex items-center justify-between border-b px-4 py-4 sm:px-5 ${
            darkMode ? "border-slate-700" : "border-pink-100"
          }`}
        >
          <h2
            className={`flex items-center gap-2 text-base font-semibold ${
              darkMode ? "text-white" : "text-slate-900"
            }`}
          >
            <UserPlus size={18} className="text-pink-500" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md p-1.5 transition ${
              darkMode
                ? "text-slate-300 hover:bg-slate-800 hover:text-pink-400"
                : "text-slate-400 hover:bg-pink-50 hover:text-pink-600"
            }`}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, darkMode }) {
  return (
    <label
      className={`grid gap-1.5 text-xs font-medium ${
        darkMode ? "text-slate-200" : "text-slate-600"
      }`}
    >
      {label}
      {children}
    </label>
  );
}

export default function UsersPage({ darkMode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // View User modal (opened by clicking a table row) + reset-password loading state
  const [viewUser, setViewUser] = useState(null);
  const [resettingId, setResettingId] = useState(null);

  useEffect(() => {
    const usersQuery = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        setUsers(snapshot.docs.map(normalizeUser));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  // Keeps the View User modal in sync if the underlying user data changes
  // (e.g. after a status toggle or password reset) while it's open.
  useEffect(() => {
    if (!viewUser) return;
    const latest = users.find((u) => u.id === viewUser.id);
    if (latest) setViewUser(latest);
  }, [users, viewUser?.id]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === "Active").length;
    const inactive = users.filter((user) => user.status === "Inactive").length;
    const roleCount = new Set(users.map((user) => user.role).filter(Boolean)).size;

    return {
      total: users.length,
      active,
      inactive,
      roles: roleCount,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const queryText = search.trim().toLowerCase();

    return users.filter((user) => {
      const searchable = [
        formatName(user),
        user.studentId,
        user.username,
        user.password,
        user.position,
        user.role,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!queryText || searchable.includes(queryText)) &&
        (!roleFilter || user.role === roleFilter) &&
        (!statusFilter || user.status === statusFilter)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeRoleStyles = darkMode ? roleStylesDark : roleStyles;

  const formInputClass = darkMode
    ? "h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none transition placeholder-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
    : "h-10 w-full rounded-md border border-pink-100 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-100";

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setEditingUser(null);
    setForm({
      ...emptyForm,
      password: getNextDefaultPassword(users),
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setForm({
      studentId: user.studentId,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      suffix: user.suffix || "",
      position: user.position,
      username: user.username,
      password: user.password,
      role: user.role,
      status: user.status,
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function validateForm() {
    const studentId = form.studentId.trim();
    const firstName = form.firstName.trim();
    const middleName = form.middleName.trim();
    const lastName = form.lastName.trim();

    // Student ID is optional, but if provided must be exactly 9 digits.
    if (studentId && !/^\d{9}$/.test(studentId)) {
      return "Student ID must be exactly 9 digits.";
    }

    if (!firstName) return "First name is required.";
    if (!NAME_VALID_REGEX.test(firstName)) {
      return "First name must contain letters only (no numbers or special characters).";
    }

    if (!lastName) return "Last name is required.";
    if (!NAME_VALID_REGEX.test(lastName)) {
      return "Last name must contain letters only (no numbers or special characters).";
    }

    // Middle name is optional, but if provided must be letters only.
    if (middleName && !NAME_VALID_REGEX.test(middleName)) {
      return "Middle name must contain letters only (no numbers or special characters).";
    }

    if (!form.username.trim()) return "Username is required.";
    if (!form.password.trim()) return "Password is required.";
    if (!form.role) return "Assigned role is required.";
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    const hashedPassword = await bcrypt.hash(
      form.password.trim(),
      10
    );

    const payload = {
      studentId: form.studentId.trim(),
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      lastName: form.lastName.trim(),
      suffix: form.suffix.trim(),
      position: form.position,
      username: form.username.trim().toLowerCase(),
      password: hashedPassword,
      role: form.role,
      status: form.status,
      updatedAt: serverTimestamp(),
    };

    // AUDIT TRAIL: never log raw/hashed passwords — keep audit snapshots
    // limited to non-sensitive account fields.
    const { password: _omittedNewPassword, ...auditablePayload } = payload;

    try {
      if (editingUser) {
        await updateDoc(doc(db, USERS_COLLECTION, editingUser.id), payload);

        const { password: _omittedOldPassword, ...oldAuditableData } = editingUser;

        await logAudit({
          action: "Edited User",
          module: "Users",
          documentId: editingUser.id,
          documentTitle: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          performedBy: getCurrentUser(),
          oldData: oldAuditableData,
          newData: auditablePayload,
          description: `User account "${form.username.trim().toLowerCase()}" was updated.`,
        });

        setNotice("User account updated.");
      } else {
        const docRef = await addDoc(collection(db, USERS_COLLECTION), {
          ...payload,
          createdAt: serverTimestamp(),
          lastLoginAt: null,
        });

        await logAudit({
          action: "Added User",
          module: "Users",
          documentId: docRef.id,
          documentTitle: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          performedBy: getCurrentUser(),
          newData: auditablePayload,
          description: `New user account "${form.username.trim().toLowerCase()}" was created with role ${form.role}.`,
        });

        setNotice("User account created.");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingUser(null);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user) {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    setError("");
    setNotice("");

    try {
      await updateDoc(doc(db, USERS_COLLECTION, user.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      await logAudit({
        action: "Edited User",
        module: "Users",
        documentId: user.id,
        documentTitle: formatName(user),
        performedBy: getCurrentUser(),
        oldData: { status: user.status },
        newData: { status: nextStatus },
        description: `Account status of ${formatName(user)} changed to ${nextStatus}.`,
      });

      setNotice(`${formatName(user)} is now ${nextStatus.toLowerCase()}.`);
    } catch (toggleError) {
      setError(toggleError.message);
    }
  }

  async function deleteUser(user) {
    const confirmed = window.confirm(`Delete ${formatName(user)} from EvOSAS users?`);
    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await deleteDoc(doc(db, USERS_COLLECTION, user.id));

      const { password: _omittedPassword, ...oldAuditableData } = user;

      await logAudit({
        action: "Deleted User",
        module: "Users",
        documentId: user.id,
        documentTitle: formatName(user),
        performedBy: getCurrentUser(),
        oldData: oldAuditableData,
        description: `User account "${user.username}" (${formatName(user)}) was deleted.`,
      });

      setNotice("User account deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

function generateUniqueUsername(firstName, lastName, users) {
  const firstInitial = (firstName || "")
    .trim()
    .charAt(0)
    .toLowerCase();

  const cleanLastName = (lastName || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

  let username;
  let exists;

  do {
    const randomNumber = Math.floor(Math.random() * 90) + 10; // 10-99
    username = `${firstInitial}${cleanLastName}${randomNumber}`;

    exists = users.some(
      (user) =>
        String(user.username).toLowerCase() === username.toLowerCase()
    );
  } while (exists);

  return username;
}

  // Opens the read-only "View User" modal for the clicked row.
  function openViewModal(user) {
    setViewUser(user);
  }

  // Resets a user's password back to the standard default password
  // (bcrypt-hashed, same as new accounts get from getNextDefaultPassword).
  async function resetPassword(user) {
    const defaultPassword = getNextDefaultPassword(users);
    const confirmed = window.confirm(
      `Reset ${formatName(user)}'s password back to the default password ("${defaultPassword}")?`
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    setResettingId(user.id);

    try {
      const hashedPassword = await bcrypt.hash(defaultPassword.trim(), 10);
      await updateDoc(doc(db, USERS_COLLECTION, user.id), {
        password: hashedPassword,
        updatedAt: serverTimestamp(),
      });
      setNotice(`${formatName(user)}'s password was reset to the default password.`);
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setResettingId(null);
    }
  }

  return (
    <main
      className={`h-screen overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 ${
        darkMode ? "bg-slate-950 text-white" : "bg-pink-50/60 text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-pink-600 sm:text-2xl">User Management</h1>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-300" : "text-slate-500"}`}>
              Manage system users, roles, positions, and account access.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-pink-600 px-4 text-sm font-semibold text-white shadow-sm shadow-pink-200 transition hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Plus size={17} />
            Create user
          </button>
        </div>

            {(notice || error) && (
              <div
                className={`fixed left-1/2 top-20 z-[100] w-[92%] max-w-md -translate-x-1/2 rounded-md border px-4 py-3 text-sm shadow-lg sm:w-full ${
                  error
                    ? darkMode
                      ? "border-red-500/30 bg-slate-900 text-red-300 shadow-black/60"
                      : "border-red-200 bg-white text-red-700 shadow-red-200/60"
                    : darkMode
                    ? "border-pink-500/30 bg-slate-900 text-pink-300 shadow-black/60"
                    : "border-pink-200 bg-white text-pink-700 shadow-pink-200/60"
                }`}
              >
                {error || notice}
              </div>
            )}

        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total users" value={stats.total} darkMode={darkMode} />
          <Stat
            label="Active"
            value={stats.active}
            tone={darkMode ? "text-emerald-400" : "text-emerald-600"}
            darkMode={darkMode}
          />
          <Stat
            label="Inactive"
            value={stats.inactive}
            tone={darkMode ? "text-slate-300" : "text-slate-500"}
            darkMode={darkMode}
          />
          <Stat label="Roles" value={stats.roles} darkMode={darkMode} />
        </section>

        <section
          className={`mb-4 grid gap-3 rounded-lg border p-3 shadow-sm lg:grid-cols-[1fr_220px_180px] ${
            darkMode
              ? "border-slate-700 bg-slate-900 shadow-black/30"
              : "border-pink-100 bg-white shadow-pink-100/60"
          }`}
        >
          <div className="relative">
            <Search
              size={17}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
                darkMode ? "text-pink-400" : "text-pink-400"
              }`}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, student ID, or username"
              className={`h-10 w-full rounded-md border pl-9 pr-3 text-sm outline-none transition ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:border-pink-500 focus:bg-slate-800 focus:ring-2 focus:ring-pink-500/30"
                  : "border-pink-100 bg-pink-50/50 text-slate-900 placeholder:text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100"
              }`}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className={`h-10 rounded-md border px-3 text-sm outline-none transition ${
              darkMode
                ? "border-slate-700 bg-slate-800 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
                : "border-pink-100 bg-white text-slate-900 focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            }`}
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`h-10 rounded-md border px-3 text-sm outline-none transition ${
              darkMode
                ? "border-slate-700 bg-slate-800 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
                : "border-pink-100 bg-white text-slate-900 focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            }`}
          >
            <option value="">All status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </section>

        <section
          className={`overflow-hidden rounded-lg border shadow-sm ${
            darkMode
              ? "border-slate-700 bg-slate-900 shadow-black/30"
              : "border-pink-100 bg-white shadow-pink-100/60"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
              <thead
                className={`text-xs font-semibold uppercase tracking-wide ${
                  darkMode ? "bg-slate-800 text-slate-300" : "bg-pink-50 text-slate-500"
                }`}
              >
                <tr>
                  <th className="w-[28%] px-3 py-3 sm:px-4">Name</th>
                  <th className="w-[14%] px-3 py-3 sm:px-4">Position</th>
                  <th className="w-[16%] px-3 py-3 sm:px-4">Role</th>
                  <th className="w-[10%] px-3 py-3 sm:px-4">Status</th>
                  <th className="w-[12%] px-3 py-3 sm:px-4">Last Login</th>
                  <th className="w-[20%] px-3 py-3 text-right sm:px-4">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-pink-50"}`}>
                {loading ? (
                  <TableMessage message="Loading users..." darkMode={darkMode} />
                ) : pagedUsers.length ? (
                  pagedUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => openViewModal(user)}
                      className={`cursor-pointer ${darkMode ? "hover:bg-slate-800/60" : "hover:bg-pink-50/60"}`}
                    >
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              darkMode ? "bg-pink-500/15 text-pink-300" : "bg-pink-100 text-pink-700"
                            }`}
                          >
                            {initialsOf(user)}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`truncate font-semibold ${
                                darkMode ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {formatName(user)}
                            </p>
                            <p
                              className={`truncate text-xs ${
                                darkMode ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {user.username} · {user.studentId}
                            </p>

                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-3 sm:px-4 ${darkMode ? "text-slate-200" : "text-slate-600"}`}>
                        {user.position}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            activeRoleStyles[user.role] ||
                            (darkMode
                              ? "border-pink-500/30 bg-pink-500/10 text-pink-300"
                              : "border-pink-200 bg-pink-100 text-pink-700")
                          }`}
                        >
                          {shortRole[user.role] || user.role || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <span
                          className={`inline-flex items-center gap-2 text-xs font-medium ${
                            darkMode ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              user.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {user.status}
                        </span>
                      </td>
                        <td
                          className={`whitespace-nowrap px-3 py-3 text-xs sm:px-4 ${
                            darkMode ? "text-pink-300" : "text-pink-700"
                          }`}
                        >
                          Last Login: {formatDate(user.lastLoginAt)}
                        </td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex justify-end gap-1.5">
                          <IconButton
                            label="Edit user"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(user);
                            }}
                            darkMode={darkMode}
                          >
                            <Edit3 size={15} />
                          </IconButton>
                          <IconButton
                            label="Toggle status"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStatus(user);
                            }}
                            darkMode={darkMode}
                          >
                            {user.status === "Active" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </IconButton>
                          <IconButton
                            danger
                            label="Delete user"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteUser(user);
                            }}
                            darkMode={darkMode}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <TableMessage message="No users found." darkMode={darkMode} />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div
          className={`mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
            darkMode ? "text-slate-300" : "text-slate-500"
          }`}
        >
          <p>
            Showing {pagedUsers.length} of {filteredUsers.length} filtered users
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className={`inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                darkMode
                  ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  : "border-pink-100 bg-white text-slate-600 hover:bg-pink-50"
              }`}
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <span
              className={`rounded-md px-3 py-2 text-xs font-semibold ${
                darkMode ? "bg-slate-900 text-pink-300" : "bg-white text-pink-600"
              }`}
            >
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className={`inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                darkMode
                  ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  : "border-pink-100 bg-white text-slate-600 hover:bg-pink-50"
              }`}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editingUser ? "Edit user" : "Create new user"}
        onClose={() => setModalOpen(false)}
        darkMode={darkMode}
      >
        <form onSubmit={handleSubmit} className="px-4 py-5 sm:px-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-pink-500">
            Account information
          </p>
          <div className="grid gap-3">
            <Field label="Student ID (optional, 9 digits)" darkMode={darkMode}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={form.studentId}
                  onChange={(event) =>
                    updateForm(
                      "studentId",
                      event.target.value.replace(/\D/g, "").slice(0, 9)
                    )
                  }
                  placeholder="123456789"
                  className={formInputClass}
                />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name *" darkMode={darkMode}>
                  <input
                    value={form.firstName}
                      onChange={(event) => {
                        const firstName = sanitizeNameInput(event.target.value);

                        updateForm("firstName", firstName);
                        updateForm(
                          "username",
                          generateUniqueUsername(firstName, form.lastName, users)
                        );
                      }}
                    placeholder="Juan"
                    className={formInputClass}
                  />
                </Field>
              <Field label="Middle name" darkMode={darkMode}>
                <input
                  value={form.middleName}
                  onChange={(event) =>
                    updateForm("middleName", sanitizeNameInput(event.target.value))
                  }
                  placeholder="Cruz"
                  className={formInputClass}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Last name *" darkMode={darkMode}>
                  <input
                    value={form.lastName}
                        onChange={(event) => {
                          const lastName = sanitizeNameInput(event.target.value);

                          updateForm("lastName", lastName);
                          updateForm(
                            "username",
                            generateUniqueUsername(form.firstName, lastName, users)
                          );
                        }}
                    placeholder="Dela Cruz"
                    className={formInputClass}
                  />
                </Field>
                <Field label="Suffix" darkMode={darkMode}>
                  <input
                    value={form.suffix}
                    onChange={(event) => updateForm("suffix", event.target.value)}
                    placeholder="Jr., Sr., III"
                    className={formInputClass}
                  />
                </Field>
            </div>

            <Field label="Position (Only For SSC, optional)" darkMode={darkMode}>
              <select
                value={form.position}
                onChange={(event) => updateForm("position", event.target.value)}
                className={formInputClass}
              >
                <option value="">Select position...</option>
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className={`my-5 border-t pt-4 ${darkMode ? "border-slate-700" : "border-pink-100"}`}>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-pink-500">
              Login information
            </p>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Username *" darkMode={darkMode}>
                  <input
                    value={form.username}
                    onChange={(event) => updateForm("username", event.target.value)}
                    placeholder="jdelacruz"
                    className={formInputClass}
                  />
                </Field>
                    <Field label="Default password" darkMode={darkMode}>
                      <input
                        value={form.password}
                        readOnly
                        className={`${formInputClass} cursor-not-allowed ${
                          darkMode ? "bg-slate-800/60 text-slate-400" : "bg-slate-100"
                        }`}
                      />
                    </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Assigned role" darkMode={darkMode}>
                  <select
                    value={form.role}
                    onChange={(event) => updateForm("role", event.target.value)}
                    className={formInputClass}
                  >
                    <option value="">Select role...</option>
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Account status" darkMode={darkMode}>
                  <select
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                    className={formInputClass}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </Field>
              </div>
            </div>
          </div>

          <div
            className={`flex flex-col-reverse justify-end gap-2 border-t pt-4 sm:flex-row ${
              darkMode ? "border-slate-700" : "border-pink-100"
            }`}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${
                darkMode
                  ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "border-pink-100 bg-white text-slate-600 hover:bg-pink-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-pink-600 px-4 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:cursor-wait disabled:opacity-70"
            >
              <Check size={16} />
              {saving ? "Saving..." : editingUser ? "Save changes" : "Create user"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View User Modal — opened by clicking a table row */}
      <Modal
        open={!!viewUser}
        title="User Details"
        onClose={() => setViewUser(null)}
        darkMode={darkMode}
      >
        {viewUser && (
          <div className="px-4 py-5 sm:px-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  darkMode ? "bg-pink-500/15 text-pink-300" : "bg-pink-100 text-pink-700"
                }`}
              >
                {initialsOf(viewUser)}
              </div>
              <div className="min-w-0">
                <p className={`truncate text-base font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {formatName(viewUser) || "—"}
                </p>
                <p className={`truncate text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  @{viewUser.username || "—"}
                </p>
              </div>
              <span
                className={`ml-auto inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  activeRoleStyles[viewUser.role] ||
                  (darkMode
                    ? "border-pink-500/30 bg-pink-500/10 text-pink-300"
                    : "border-pink-200 bg-pink-100 text-pink-700")
                }`}
              >
                {shortRole[viewUser.role] || viewUser.role || "Unassigned"}
              </span>
            </div>

            <div className={`my-4 grid grid-cols-2 gap-4 border-t pt-4 ${darkMode ? "border-slate-700" : "border-pink-100"}`}>
              <div>
                <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Student ID</p>
                <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {viewUser.studentId || "—"}
                </p>
              </div>
              <div>
                <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Suffix</p>
                <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {viewUser.suffix || "—"}
                </p>
              </div>
              <div>
                <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Position</p>
                <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {viewUser.position || "—"}
                </p>
              </div>
              <div>
                <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Status</p>
                <p className={`flex items-center gap-1.5 text-sm font-medium ${darkMode ? "text-white" : "text-slate-900"}`}>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      viewUser.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {viewUser.status || "—"}
                </p>
              </div>
              <div>
                <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Last Login</p>
                <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {formatDate(viewUser.lastLoginAt)}
                </p>
              </div>
              <div>
                <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Created</p>
                <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {formatDate(viewUser.createdAt)}
                </p>
              </div>
              <div>
                <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Last Updated</p>
                <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {formatDate(viewUser.updatedAt)}
                </p>
              </div>
            </div>

            <div
              className={`flex flex-col-reverse justify-end gap-2 border-t pt-4 sm:flex-row ${
                darkMode ? "border-slate-700" : "border-pink-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "border-pink-100 bg-white text-slate-600 hover:bg-pink-50"
                }`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => resetPassword(viewUser)}
                disabled={resettingId === viewUser.id}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "border-pink-100 bg-white text-slate-600 hover:bg-pink-50"
                }`}
              >
                <KeyRound size={16} />
                {resettingId === viewUser.id ? "Resetting..." : "Reset Password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const user = viewUser;
                  setViewUser(null);
                  openEditModal(user);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-pink-600 px-4 text-sm font-semibold text-white transition hover:bg-pink-700"
              >
                <Edit3 size={16} />
                Edit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}

function Stat({ label, value, tone, darkMode }) {
  const resolvedTone = tone || (darkMode ? "text-pink-400" : "text-pink-600");
  return (
    <div
      className={`rounded-lg border p-3 shadow-sm sm:p-4 ${
        darkMode
          ? "border-slate-700 bg-slate-900 shadow-black/30"
          : "border-pink-100 bg-white shadow-pink-100/60"
      }`}
    >
      <p className={`text-xs font-medium ${darkMode ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-1 text-xl font-bold sm:text-2xl ${resolvedTone}`}>{value}</p>
    </div>
  );
}

function IconButton({ label, danger = false, disabled = false, children, onClick, darkMode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? darkMode
            ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
            : "border-red-100 text-red-500 hover:bg-red-50"
          : darkMode
          ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-pink-400"
          : "border-pink-100 text-slate-500 hover:bg-pink-50 hover:text-pink-600"
      }`}
    >
      {children}
    </button>
  );
}

function TableMessage({ message, darkMode }) {
  return (
    <tr>
      <td
        colSpan={6}
        className={`px-4 py-10 text-center text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}
      >
        {message}
      </td>
    </tr>
  );
}