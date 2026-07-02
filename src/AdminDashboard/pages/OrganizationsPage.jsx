import { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp,} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { FaEye, FaTrash, FaClipboardCheck, FaUpload, FaFolderOpen, FaDownload,} from "react-icons/fa";


const STATUS_CONFIG = {
  "In Progress": {
    label: "In Progress",
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    badgeDark: "bg-blue-500/10 text-blue-300 border border-blue-500/30",
    dot: "bg-blue-400",
  },
  Approved: {
    label: "Approved",
    badge: "bg-green-100 text-green-700 border border-green-200",
    badgeDark: "bg-green-500/10 text-green-300 border border-green-500/30",
    dot: "bg-green-400",
  },
  Rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-700 border border-red-200",
    badgeDark: "bg-red-500/10 text-red-300 border border-red-500/30",
    dot: "bg-red-400",
  },
};

const STATUSES = Object.keys(STATUS_CONFIG);
const DOCUMENT_TYPES = ["Profile", "Accomplishment Report", "By-laws"];

export default function OrganizationsPage({ darkMode }) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortField, setSortField] = useState("uploadedAt");
  const [sortDir, setSortDir] = useState("desc");

  // Upload document modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadOrgName, setUploadOrgName] = useState("");
  const [uploadDocType, setUploadDocType] = useState(DOCUMENT_TYPES[2]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // View submission (folder) modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewGroup, setViewGroup] = useState(null);

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

  // Deletes both the Firestore record AND the actual file in Firebase
  // Storage, so removed documents don't keep taking up storage space.
  const handleDelete = async (item) => {
    try {
      if (item.fileURL) {
        try {
          const storage = getStorage();
          await deleteObject(storageRef(storage, item.fileURL));
        } catch (storageErr) {
          // File may already be missing from Storage (e.g. manually removed);
          // don't block deleting the Firestore record because of that.
          console.warn("Could not delete file from Storage:", storageErr);
        }
      }
      await deleteDoc(doc(db, "organization_bylaws", item.id));
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

  // Groups every submission (including resubmissions) for the same organization
  // together, so admins can always see the latest resubmitted document plus
  // the organization's submission history in one place.
  const openViewModal = (item) => {
    const submissions = uploads
      .filter((u) => u.organization === item.organization)
      .sort((a, b) => (b.uploadedAt?.seconds ?? 0) - (a.uploadedAt?.seconds ?? 0));
    setViewGroup({ organization: item.organization, submissions });
    setViewModalOpen(true);
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const openUploadModal = () => {
    setUploadOrgName("");
    setUploadDocType(DOCUMENT_TYPES[2]);
    setUploadFile(null);
    setUploadModalOpen(true);
  };

  const handleUploadDocument = async () => {
    if (!uploadOrgName.trim()) return showToast("Enter an organization name.", "error");
    if (!uploadFile) return showToast("Choose a file to upload.", "error");

    setUploading(true);
    try {
      const storage = getStorage();
      const path = `organization_bylaws/${Date.now()}_${uploadFile.name}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, uploadFile);
      const fileURL = await getDownloadURL(fileRef);

      await addDoc(collection(db, "organization_bylaws"), {
        organization: uploadOrgName.trim(),
        documentType: uploadDocType,
        fileName: uploadFile.name,
        fileURL,
        status: STATUSES[0],
        uploadedAt: serverTimestamp(),
      });

      showToast("Document uploaded successfully.");
      setUploadModalOpen(false);
      setUploadOrgName("");
      setUploadFile(null);
    } catch (e) {
      showToast("Failed to upload document.", "error");
    } finally {
      setUploading(false);
    }
  };

  const filtered = uploads
    .filter((u) => {
      const matchSearch =
        u.organization?.toLowerCase().includes(search.toLowerCase()) ||
        u.fileName?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || u.status === filterStatus;
      const matchType = filterType === "All" || (u.documentType ?? "By-laws") === filterType;
      return matchSearch && matchStatus && matchType;
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

  const inputClass = darkMode
    ? "border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:ring-2 focus:ring-pink-500/30"
    : "border-gray-200 bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-pink-400";

  return (
    <div className={`h-screen overflow-hidden font-sans flex flex-col ${darkMode ? "bg-slate-950" : "bg-gray-50"}`}>
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
      <div className="flex-shrink-0 bg-pink-600 text-white px-4 sm:px-6 py-5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
              Organizations Management
            </h1>
            <p className="text-pink-200 text-sm mt-0.5">
              Review and manage submitted organization by-laws
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={openUploadModal}
              className="inline-flex items-center gap-2 bg-white text-pink-700 hover:bg-pink-50 rounded-xl px-4 py-2 text-sm font-semibold transition"
            >
              <FaUpload size={13} />
              Upload Document
            </button>
            <div className="bg-pink-700 rounded-xl px-4 py-2 text-sm font-semibold text-pink-100">
              {uploads.length} Total Submission{uploads.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? "All" : s)}
                  className={`rounded-2xl p-4 text-left shadow-sm border-2 transition-all duration-200 ${
                    filterStatus === s
                      ? darkMode
                        ? "border-pink-500 bg-pink-500/10"
                        : "border-pink-600 bg-pink-50"
                      : darkMode
                      ? "border-transparent bg-slate-900 hover:border-pink-500/40"
                      : "border-transparent bg-white hover:border-pink-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        darkMode ? "text-slate-400" : "text-gray-500"
                      }`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className={`text-3xl font-extrabold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {counts[s] ?? 0}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div
            className={`rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center ${
              darkMode ? "bg-slate-900" : "bg-white"
            }`}
          >
            <div className="relative flex-1">
              <span
                className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
                  darkMode ? "text-slate-500" : "text-gray-400"
                }`}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by organization or file name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none transition ${inputClass}`}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`border rounded-xl px-3 py-2.5 text-sm outline-none transition ${inputClass}`}
            >
              <option value="All">All Document Types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`border rounded-xl px-3 py-2.5 text-sm outline-none transition ${inputClass}`}
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className={`rounded-2xl shadow-sm overflow-hidden ${darkMode ? "bg-slate-900" : "bg-white"}`}>
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
                  <table className="min-w-[820px] w-full">
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
                          onClick={() => toggleSort("documentType")}
                        >
                          Document Type <SortIcon field="documentType" />
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
                    <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-gray-100"}`}>
                      {filtered.length > 0 ? (
                        filtered.map((item) => {
                          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG[STATUSES[0]];
                          return (
                            <tr
                              key={item.id}
                              onClick={() => openViewModal(item)}
                              className={`transition cursor-pointer ${darkMode ? "hover:bg-slate-800/60" : "hover:bg-pink-50"}`}
                            >
                              <td
                                className={`px-5 py-4 font-medium text-sm ${
                                  darkMode ? "text-white" : "text-gray-800"
                                }`}
                              >
                                {item.organization}
                              </td>
                              <td
                                className={`px-5 py-4 text-sm ${
                                  darkMode ? "text-slate-300" : "text-gray-600"
                                }`}
                              >
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    darkMode
                                      ? "bg-slate-800 text-slate-300 border border-slate-700"
                                      : "bg-gray-100 text-gray-600 border border-gray-200"
                                  }`}
                                >
                                  {item.documentType || "By-laws"}
                                </span>
                              </td>
                              <td
                                className={`px-5 py-4 text-sm max-w-[200px] truncate ${
                                  darkMode ? "text-slate-300" : "text-gray-600"
                                }`}
                                title={item.fileName}
                              >
                                📄 {item.fileName}
                              </td>
                              <td
                                className={`px-5 py-4 text-sm ${
                                  darkMode ? "text-slate-400" : "text-gray-500"
                                }`}
                              >
                                {item.uploadedAt?.seconds
                                  ? new Date(item.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "—"}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                    darkMode ? cfg.badgeDark : cfg.badge
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {item.status || STATUSES[0]}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openViewModal(item);
                                    }}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                  >
                                    <FaEye />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openModal(item);
                                    }}
                                    className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                  >
                                    <FaClipboardCheck />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm(item);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                      darkMode
                                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-300"
                                        : "bg-red-100 hover:bg-red-200 text-red-700"
                                    }`}
                                  >
                                    <FaTrash />
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
                <div className={`sm:hidden divide-y ${darkMode ? "divide-slate-800" : "divide-gray-100"}`}>
                  {filtered.length > 0 ? (
                    filtered.map((item) => {
                      const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG[STATUSES[0]];
                      return (
                        <div
                          key={item.id}
                          onClick={() => openViewModal(item)}
                          className="p-4 space-y-3 cursor-pointer"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className={`font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                                {item.organization}
                              </p>
                              <p
                                className={`text-xs mt-0.5 ${
                                  darkMode ? "text-slate-400" : "text-gray-500"
                                }`}
                              >
                                {item.documentType || "By-laws"}
                              </p>
                              <p
                                className={`text-xs mt-0.5 truncate max-w-[200px] ${
                                  darkMode ? "text-slate-400" : "text-gray-500"
                                }`}
                              >
                                {item.fileName}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                darkMode ? cfg.badgeDark : cfg.badge
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {item.status || STATUSES[0]}
                            </span>
                          </div>
                          <p className={`text-xs ${darkMode ? "text-slate-500" : "text-gray-400"}`}>
                            Submitted:{" "}
                            {item.uploadedAt?.seconds
                              ? new Date(item.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                                  year: "numeric", month: "short", day: "numeric",
                                })
                              : "—"}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openViewModal(item);
                              }}
                              className="flex-1 text-center bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold transition"
                            >
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal(item);
                              }}
                              className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-2 rounded-lg text-xs font-semibold transition"
                            >
                              Review
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(item);
                              }}
                              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                                darkMode
                                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-300"
                                  : "bg-red-100 hover:bg-red-200 text-red-700"
                              }`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={`text-center py-16 ${darkMode ? "text-slate-500" : "text-gray-400"}`}>
                      <span className="text-4xl block mb-2">📂</span>
                      <p className="font-medium">No submissions found</p>
                      <p className="text-sm">Try adjusting your filter.</p>
                    </div>
                  )}
                </div>

                {/* Footer count */}
                {filtered.length > 0 && (
                  <div
                    className={`px-5 py-3 border-t text-xs ${
                      darkMode ? "border-slate-800 text-slate-500" : "border-gray-100 text-gray-400"
                    }`}
                  >
                    Showing {filtered.length} of {uploads.length} submission{uploads.length !== 1 ? "s" : ""}
                  </div>
                )}
              </>
            )}
        </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && !uploading && setUploadModalOpen(false)}
        >
          <div
            className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in ${
              darkMode ? "bg-slate-900" : "bg-white"
            }`}
          >
            <div className="bg-pink-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Upload Document</h2>
              <button
                onClick={() => !uploading && setUploadModalOpen(false)}
                className="text-pink-200 hover:text-white text-xl font-bold leading-none"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    darkMode ? "text-slate-400" : "text-gray-400"
                  }`}
                >
                  Organization Name
                </p>
                <input
                  type="text"
                  placeholder="e.g. Supreme Student Council"
                  value={uploadOrgName}
                  onChange={(e) => setUploadOrgName(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition ${inputClass}`}
                />
              </div>

              <div className="space-y-1">
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    darkMode ? "text-slate-400" : "text-gray-400"
                  }`}
                >
                  Document Type
                </p>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition ${inputClass}`}
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    darkMode ? "text-slate-400" : "text-gray-400"
                  }`}
                >
                  Document File
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className={`w-full text-sm rounded-xl border px-3 py-2.5 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-pink-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-pink-700 ${inputClass}`}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}
                  className={`flex-1 border-2 font-semibold py-2.5 rounded-xl transition text-sm disabled:opacity-60 ${
                    darkMode
                      ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadDocument}
                  disabled={uploading}
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2.5 rounded-xl transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Submission (Folder) Modal */}
      {viewModalOpen && viewGroup && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setViewModalOpen(false)}
        >
          <div
            className={`rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-fade-in ${
              darkMode ? "bg-slate-900" : "bg-white"
            }`}
          >
            {/* Modal Header */}
            <div className="bg-pink-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FaFolderOpen className="text-pink-200 flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-white font-bold text-lg truncate">{viewGroup.organization}</h2>
                  <p className="text-pink-200 text-xs">
                    {viewGroup.submissions.length} submission{viewGroup.submissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="text-pink-200 hover:text-white text-xl font-bold leading-none flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-3 overflow-y-auto">
              {viewGroup.submissions.map((sub) => {
                const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG[STATUSES[0]];
                return (
                  <div
                    key={sub.id}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
                      darkMode ? "border-slate-700 bg-slate-800/60" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`text-sm font-semibold truncate ${darkMode ? "text-white" : "text-gray-800"}`}
                          title={sub.fileName}
                        >
                          📄 {sub.fileName}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            darkMode
                              ? "bg-slate-700 text-slate-300 border border-slate-600"
                              : "bg-gray-200 text-gray-600 border border-gray-300"
                          }`}
                        >
                          {sub.documentType || "By-laws"}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                        {sub.uploadedAt?.seconds
                          ? new Date(sub.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                              year: "numeric", month: "short", day: "numeric",
                            })
                          : "—"}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          darkMode ? cfg.badgeDark : cfg.badge
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {sub.status || STATUSES[0]}
                      </span>
                    </div>
                    <a
                      href={sub.fileURL}
                      download={sub.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition"
                    >
                      <FaDownload />
                      Download
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {modalOpen && selectedItem && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div
            className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in ${
              darkMode ? "bg-slate-900" : "bg-white"
            }`}
          >
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
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>Organization</p>
                <p className={`font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>{selectedItem.organization}</p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>Document Type</p>
                <p className={`text-sm ${darkMode ? "text-slate-200" : "text-gray-700"}`}>{selectedItem.documentType || "By-laws"}</p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>File</p>
                <p className={`text-sm ${darkMode ? "text-slate-200" : "text-gray-700"}`}>{selectedItem.fileName}</p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>Date Submitted</p>
                <p className={`text-sm ${darkMode ? "text-slate-200" : "text-gray-700"}`}>
                  {selectedItem.uploadedAt?.seconds
                    ? new Date(selectedItem.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                        year: "numeric", month: "long", day: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>Current Status</p>
                {(() => {
                  const cfg = STATUS_CONFIG[selectedItem.status] ?? STATUS_CONFIG[STATUSES[0]];
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        darkMode ? cfg.badgeDark : cfg.badge
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {selectedItem.status || STATUSES[0]}
                    </span>
                  );
                })()}
              </div>

              <a
                href={selectedItem.fileURL}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full border-2 font-semibold py-2.5 rounded-xl transition text-sm ${
                  darkMode
                    ? "border-pink-500 text-pink-400 hover:bg-pink-500/10"
                    : "border-pink-600 text-pink-600 hover:bg-pink-50"
                }`}
              >
                📄 Open Document
              </a>

              <div className="space-y-2 pt-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-gray-400"}`}>Update Status</p>
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
                            : darkMode
                            ? "border-slate-700 bg-slate-800 text-slate-200 hover:border-pink-500/50 hover:text-pink-400"
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
          <div
            className={`rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden ${
              darkMode ? "bg-slate-900" : "bg-white"
            }`}
          >
            <div className="bg-red-500 px-6 py-4">
              <h2 className="text-white font-bold text-lg">Confirm Delete</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className={`text-sm ${darkMode ? "text-slate-200" : "text-gray-700"}`}>
                Are you sure you want to delete the submission from{" "}
                <span className="font-bold">{deleteConfirm.organization}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`flex-1 border-2 font-semibold py-2.5 rounded-xl transition text-sm ${
                    darkMode
                      ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
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