import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,} from "firebase/firestore";
import { Check, ChevronLeft, ChevronRight, Edit3, Plus, Search, ToggleLeft, ToggleRight, Trash2, UserPlus, X,} from "lucide-react";
import { db } from "../../firebase/firebase";
import bcrypt from "bcryptjs";

const USERS_COLLECTION = "users";
const PAGE_SIZE = 4;

const emptyForm = {
  studentId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  position: "",
  username: "",
  password: "",
  role: "",
  status: "Active",
};

const roles = [
  "Administrator",
  "SSC Officer",
  "Student Disciplinary Officer",
  "Student Organization Coordinator",
];

const positions = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Public Information Officer",
  "Representative",
  "Adviser",
];

const roleStyles = {
  Administrator: "bg-pink-100 text-pink-700 border-pink-200",
  "SSC Officer": "bg-rose-100 text-rose-700 border-rose-200",
  "Student Disciplinary Officer": "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "Student Organization Coordinator": "bg-purple-100 text-purple-700 border-purple-200",
};

const formInputClass =
  "h-10 rounded-md border border-pink-100 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-100";

const shortRole = {
  Administrator: "Admin",
  "SSC Officer": "SSC Officer",
  "Student Disciplinary Officer": "SDO",
  "Student Organization Coordinator": "SOC",
};

function getNextDefaultPassword(users) {
  const nextNumber =
    users.reduce((highest, user) => {
      const match = String(user.password || "").match(/^EvOSAS-(\d{4,})$/);
      const number = match ? Number(match[1]) : 0;
      return Math.max(highest, number);
    }, 0) + 1;

  return `EvOSAS-${String(nextNumber).padStart(4, "0")}`;
}

function formatName(user) {
  return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
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

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-pink-100 bg-white shadow-2xl shadow-pink-200/60">
        <div className="flex items-center justify-between border-b border-pink-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <UserPlus size={18} className="text-pink-500" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-pink-50 hover:text-pink-600"
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

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-slate-600">
      {label}
      {children}
    </label>
  );
}

export default function UsersPage() {
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
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim()) return "Last name is required.";
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
      position: form.position,
      username: form.username.trim().toLowerCase(),
      password: hashedPassword,
      role: form.role,
      status: form.status,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingUser) {
        await updateDoc(doc(db, USERS_COLLECTION, editingUser.id), payload);
        setNotice("User account updated.");
      } else {
        await addDoc(collection(db, USERS_COLLECTION), {
          ...payload,
          createdAt: serverTimestamp(),
          lastLoginAt: null,
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
      setNotice("User account deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-pink-50/60 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-pink-600">User Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage system users, roles, positions, and account access.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-pink-600 px-4 text-sm font-semibold text-white shadow-sm shadow-pink-200 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
          >
            <Plus size={17} />
            Create user
          </button>
        </div>

        {(notice || error) && (
          <div
            className={`mb-4 rounded-md border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-pink-200 bg-white text-pink-700"
            }`}
          >
            {error || notice}
          </div>
        )}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total users" value={stats.total} />
          <Stat label="Active" value={stats.active} tone="text-emerald-600" />
          <Stat label="Inactive" value={stats.inactive} tone="text-slate-500" />
          <Stat label="Roles" value={stats.roles} />
        </section>

        <section className="mb-4 grid gap-3 rounded-lg border border-pink-100 bg-white p-3 shadow-sm shadow-pink-100/60 lg:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pink-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, student ID, or username"
              className="h-10 w-full rounded-md border border-pink-100 bg-pink-50/50 pl-9 pr-3 text-sm outline-none transition focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-10 rounded-md border border-pink-100 bg-white px-3 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
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
            className="h-10 rounded-md border border-pink-100 bg-white px-3 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
          >
            <option value="">All status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </section>

        <section className="overflow-hidden rounded-lg border border-pink-100 bg-white shadow-sm shadow-pink-100/60">
          <div className="overflow-x-auto">
            <table className="min-w-[940px] w-full table-fixed border-collapse text-left text-sm">
              <thead className="bg-pink-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-[30%] px-4 py-3">Name</th>
                  <th className="w-[15%] px-4 py-3">Position</th>
                  <th className="w-[18%] px-4 py-3">Role</th>
                  <th className="w-[12%] px-4 py-3">Status</th>
                  <th className="w-[12%] px-4 py-3">Last Login</th>
                  <th className="w-[12%] px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {loading ? (
                  <TableMessage message="Loading users..." />
                ) : pagedUsers.length ? (
                  pagedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-pink-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-700">
                            {initialsOf(user)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{formatName(user)}</p>
                            <p className="truncate text-xs text-slate-500">
                              {user.username} · {user.studentId}
                            </p>

                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.position}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            roleStyles[user.role] || "border-pink-200 bg-pink-100 text-pink-700"
                          }`}
                        >
                          {shortRole[user.role] || user.role || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              user.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {user.status}
                        </span>
                      </td>
                        <td className="truncate text-xs text-pink-700">
                          Last Login: {formatDate(user.lastLoginAt)}
                        </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <IconButton label="Edit user" onClick={() => openEditModal(user)}>
                            <Edit3 size={15} />
                          </IconButton>
                          <IconButton label="Toggle status" onClick={() => toggleStatus(user)}>
                            {user.status === "Active" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </IconButton>
                          <IconButton danger label="Delete user" onClick={() => deleteUser(user)}>
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <TableMessage message="No users found." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {pagedUsers.length} of {filteredUsers.length} filtered users
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-pink-100 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-pink-600">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-pink-100 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-50"
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
      >
        <form onSubmit={handleSubmit} className="px-5 py-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-pink-500">
            Account information
          </p>
          <div className="grid gap-3">
            <Field label="Student ID">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.studentId}
                  onChange={(event) =>
                    updateForm(
                      "studentId",
                      event.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="123456789"
                  className={formInputClass}
                />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <input
                  value={form.firstName}
                  onChange={(event) => updateForm("firstName", event.target.value)}
                  placeholder="Juan"
                  className={formInputClass}
                />
              </Field>
              <Field label="Middle name">
                <input
                  value={form.middleName}
                  onChange={(event) => updateForm("middleName", event.target.value)}
                  placeholder="Cruz"
                  className={formInputClass}
                />
              </Field>
            </div>

            <Field label="Last name">
              <input
                value={form.lastName}
                onChange={(event) => updateForm("lastName", event.target.value)}
                placeholder="Dela Cruz"
                className={formInputClass}
              />
            </Field>

            <Field label="Position">
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

          <div className="my-5 border-t border-pink-100 pt-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-pink-500">
              Login information
            </p>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Username">
                  <input
                    value={form.username}
                    onChange={(event) => updateForm("username", event.target.value)}
                    placeholder="jdelacruz"
                    className={formInputClass}
                  />
                </Field>
                    <Field label="Default password">
                      <input
                        value={form.password}
                        readOnly
                        className={`${formInputClass} cursor-not-allowed bg-slate-100`}
                      />
                    </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Assigned role">
                  <select
                    value={form.role}
                    onChange={(event) => updateForm("role", event.target.value)}
                    className={formInputClass}
                  >
                    <option value="">Select role...</option>
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Account status">
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

          <div className="flex justify-end gap-2 border-t border-pink-100 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 rounded-md border border-pink-100 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-pink-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-pink-600 px-4 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-wait disabled:opacity-70"
            >
              <Check size={16} />
              {saving ? "Saving..." : editingUser ? "Save changes" : "Create user"}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}

function Stat({ label, value, tone = "text-pink-600" }) {
  return (
    <div className="rounded-lg border border-pink-100 bg-white p-4 shadow-sm shadow-pink-100/60">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function IconButton({ label, danger = false, children, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
        danger
          ? "border-red-100 text-red-500 hover:bg-red-50"
          : "border-pink-100 text-slate-500 hover:bg-pink-50 hover:text-pink-600"
      }`}
    >
      {children}
    </button>
  );
}

function TableMessage({ message }) {
  return (
    <tr>
      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
        {message}
      </td>
    </tr>
  );
}
