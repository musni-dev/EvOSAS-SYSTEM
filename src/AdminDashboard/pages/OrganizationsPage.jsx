import { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const STATUS_CONFIG = {
  Pending: {
    label: "Pending",
    badge: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    dot: "bg-yellow-400",
  },
  "In Process": {
    label: "In Process",
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    dot: "bg-blue-400",
  },
  Approved: {
    label: "Approved",
    badge: "bg-green-100 text-green-700 border border-green-200",
    dot: "bg-green-400",
  },
  Rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-700 border border-red-200",
    dot: "bg-red-400",
  },
};

const STATUSES = Object.keys(STATUS_CONFIG);

export default function OrganizationsPage() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortField, setSortField] = useState("uploadedAt");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    const q = query(
      collection(db, "organization_bylaws"),
      orderBy("uploadedAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const files = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUploads(files);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "organization_bylaws", id), { status: newStatus });
      showToast(`Status updated to "${newStatus}".`);
      setModalOpen(false);
      setSelectedItem(null);
    } catch (e) {
      showToast("Failed to update status.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "organization_bylaws", id));
      showToast("Document deleted.");
      setDeleteConfirm(null);
    } catch (e) {
      showToast("Failed to delete.", "error");
    }
  };

  const openModal = (item) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = uploads
    .filter((u) => {
      const matchSearch =
        u.organization?.toLowerCase().includes(search.toLowerCase()) ||
        u.fileName?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || u.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "uploadedAt") {
        aVal = a.uploadedAt?.seconds ?? 0;
        bVal = b.uploadedAt?.seconds ?? 0;
      } else {
        aVal = (aVal ?? "").toString().toLowerCase();
        bVal = (bVal ?? "").toString().toLowerCase();
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = uploads.filter((u) => u.status === s).length;
    return acc;
  }, {});

  const SortIcon = ({ field }) => (
    <span className="ml-1 inline-block text-pink-200">
      {sortField === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  return (
    <div className="h-screen overflow-hidden bg-gray-50 font-sans flex flex-col">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all duration-300 ${
            toast.type === "error" ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {toast.type === "error" ? "✕ " : "✓ "}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 bg-pink-600 text-white px-6 py-5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Organizations Management
            </h1>
            <p className="text-pink-200 text-sm mt-0.5">
              Review and manage submitted organization by-laws
            </p>
          </div>
          <div className="bg-pink-700 rounded-xl px-4 py-2 text-sm font-semibold text-pink-100 self-start sm:self-auto">
            {uploads.length} Total Submission{uploads.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? "All" : s)}
                  className={`rounded-2xl p-4 text-left shadow-sm border-2 transition-all duration-200 ${
                    filterStatus === s
                      ? "border-pink-600 bg-pink-50"
                      : "border-transparent bg-white hover:border-pink-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-800">
                    {counts[s] ?? 0}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by organization or file name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-pink-400 font-medium">
                <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading submissions…
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-pink-600 text-white text-sm">
                        <th
                          className="px-5 py-3.5 text-left font-semibold cursor-pointer select-none hover:bg-pink-700 transition"
                          onClick={() => toggleSort("organization")}
                        >
                          Organization <SortIcon field="organization" />
                        </th>
                        <th
                          className="px-5 py-3.5 text-left font-semibold cursor-pointer select-none hover:bg-pink-700 transition"
                          onClick={() => toggleSort("fileName")}
                        >
                          File Name <SortIcon field="fileName" />
                        </th>
                        <th
                          className="px-5 py-3.5 text-left font-semibold cursor-pointer select-none hover:bg-pink-700 transition"
                          onClick={() => toggleSort("uploadedAt")}
                        >
                          Date Submitted <SortIcon field="uploadedAt" />
                        </th>
                        <th
                          className="px-5 py-3.5 text-left font-semibold cursor-pointer select-none hover:bg-pink-700 transition"
                          onClick={() => toggleSort("status")}
                        >
                          Status <SortIcon field="status" />
                        </th>
                        <th className="px-5 py-3.5 text-center font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.length > 0 ? (
                        filtered.map((item) => {
                          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG["Pending"];
                          return (
                            <tr key={item.id} className="hover:bg-pink-50 transition">
                              <td className="px-5 py-4 font-medium text-gray-800 text-sm">
                                {item.organization}
                              </td>
                              <td className="px-5 py-4 text-gray-600 text-sm max-w-[200px] truncate" title={item.fileName}>
                                📄 {item.fileName}
                              </td>
                              <td className="px-5 py-4 text-gray-500 text-sm">
                                {item.uploadedAt?.seconds
                                  ? new Date(item.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "—"}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {item.status || "Pending"}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-center gap-2">
                                  <a
                                    href={item.fileURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                  >
                                    View
                                  </a>
                                  <button
                                    onClick={() => openModal(item)}
                                    className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                  >
                                    Review
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(item)}
                                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-16">
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <span className="text-4xl">📂</span>
                              <p className="font-medium">No submissions found</p>
                              <p className="text-sm">Try adjusting your search or filter.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {filtered.length > 0 ? (
                    filtered.map((item) => {
                      const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG["Pending"];
                      return (
                        <div key={item.id} className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-semibold text-gray-800">{item.organization}</p>
                              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{item.fileName}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {item.status || "Pending"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Submitted:{" "}
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
                              onClick={() => openModal(item)}
                              className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-2 rounded-lg text-xs font-semibold transition"
                            >
                              Review
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(item)}
                              className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg text-xs font-semibold transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 text-gray-400">
                      <span className="text-4xl block mb-2">📂</span>
                      <p className="font-medium">No submissions found</p>
                      <p className="text-sm">Try adjusting your filter.</p>
                    </div>
                  )}
                </div>

                {/* Footer count */}
                {filtered.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
                    Showing {filtered.length} of {uploads.length} submission{uploads.length !== 1 ? "s" : ""}
                  </div>
                )}
              </>
            )}
        </div>
        </div>
      </div>

      {/* Review Modal */}
      {modalOpen && selectedItem && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="bg-pink-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Review Submission</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-pink-200 hover:text-white text-xl font-bold leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Organization</p>
                <p className="text-gray-800 font-semibold">{selectedItem.organization}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">File</p>
                <p className="text-gray-700 text-sm">{selectedItem.fileName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Date Submitted</p>
                <p className="text-gray-700 text-sm">
                  {selectedItem.uploadedAt?.seconds
                    ? new Date(selectedItem.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                        year: "numeric", month: "long", day: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Current Status</p>
                {(() => {
                  const cfg = STATUS_CONFIG[selectedItem.status] ?? STATUS_CONFIG["Pending"];
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {selectedItem.status || "Pending"}
                    </span>
                  );
                })()}
              </div>

              <a
                href={selectedItem.fileURL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border-2 border-pink-600 text-pink-600 hover:bg-pink-50 font-semibold py-2.5 rounded-xl transition text-sm"
              >
                📄 Open Document
              </a>

              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = selectedItem.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(selectedItem.id, s)}
                        disabled={updating || isActive}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition border-2 ${
                          isActive
                            ? "border-pink-600 bg-pink-600 text-white cursor-default"
                            : "border-gray-200 bg-white text-gray-700 hover:border-pink-400 hover:text-pink-700"
                        } disabled:opacity-60`}
                      >
                        {isActive ? "✓ " : ""}{s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-500 px-6 py-4">
              <h2 className="text-white font-bold text-lg">Confirm Delete</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-gray-700 text-sm">
                Are you sure you want to delete the submission from{" "}
                <span className="font-bold">{deleteConfirm.organization}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-xl transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}