import { useState, useEffect, useRef } from "react";
import { db, storage } from "../../firebase/firebase";
import { collection, addDoc, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot, serverTimestamp,} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL,  deleteObject } from "firebase/storage";
import { color } from "framer-motion";
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

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Electronics", "Documents", "Accessories", "Clothing",
  "Bags & Wallets", "Keys", "Jewelry", "Books", "Others",
];

const STATUS_CONFIG = {
  Pending:  { bg: "#FEF3C7", color: "#92400E", dot: "#D97706" },
  Claimed:  { bg: "#D1FAE5", color: "#065F46", dot: "#059669" },
};

const TYPE_CONFIG = {
  Lost:  { bg: "#FEE2E2", color: "#991B1B" },
  Found: { bg: "#D1FAE5", color: "#065F46" },
};

const EMOJI = {
  Electronics: "📱", Documents: "🪪", Accessories: "🎒", Clothing: "👕",
  "Bags & Wallets": "👜", Keys: "🔑", Jewelry: "💍", Books: "📚", Others: "📦",
};

const EMPTY_FORM = {
  reportType: "Lost", itemName: "", category: "", description: "",
  location: "", date: "", status: "Pending", contactNumber: "", imageFile: null, categoryOther: "",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function Badge({ label, config }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
      style={{
        backgroundColor: config.bg,
        color: config.color,
      }}
    >
      {config.dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: config.dot }}
        />
      )}

      {label}
    </span>
  );
}

// ── Styles object (defined outside component to avoid re-creation) ─────────────
const S = {
  page: { padding: "24px", fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 1100, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#111", margin: 0 },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  btn: (variant = "primary") => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px",
    borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", border: "none",
    background: variant === "primary" ? "#ed00d8" : variant === "danger" ? "#EF4444" : "#F3F4F6",
    color: variant === "primary" ? "#fff" : variant === "danger" ? "#fff" : "#374151",
    transition: "opacity .15s",
  }),
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 12, marginBottom: 24 },
  statCard: (accent) => ({
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
    padding: "14px 16px", borderLeft: `3px solid ${accent}`,
  }),
  statNum: { fontSize: 24, fontWeight: 700, margin: 0, color: "#111" },
  statLabel: { fontSize: 12, color: "#6B7280", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" },
  controls: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" },
  searchBox: {
    flex: 1, minWidth: 400, padding: "9px 14px 9px 38px",
    border: "1px solid #ed00d8", borderRadius: 15, fontSize: 14, 
    background: "#F9FAFB",
  },
  searchWrap: { position: "relative", flex: 1, minWidth: 200 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" },
  pill: (active) => ({
    padding: "7px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1.5px solid",
    background: active ? "#EC4899" : "transparent",
    borderColor: active ? "#EC4899" : "#E5E7EB",
    color: active ? "#fff" : "#6B7280",
  }),
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  card: {
    background: "#fff", border: "2px solid #eb34db", borderRadius: 20,
    overflow: "hidden", cursor: "pointer", transition: "box-shadow .15s, transform .15s",
  },
  cardImg: { width: "100%", height: 150, objectFit: "cover", display: "block", background: "#F3F4F6" },
  cardImgPlaceholder: {
    height: 90, background: "linear-gradient(135deg,#FCE7F3,#DBEAFE)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
  },
  cardBody: { padding: "14px 16px"  },
  cardTitle: { fontWeight: 700, fontSize: 15, margin: "8px 0 4px", color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardMeta: { fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 16, width: "100%", maxWidth: 800,
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.15)",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 20px 14px", borderBottom: "1px solid #F3F4F6",
    position: "sticky", top: 0, background: "#fff", zIndex: 1,
  },
  modalTitle: { fontWeight: 700, fontSize: 24, margin: 0, color: "#eb34db" },
  modalBody: { padding: "18px 20px" },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid #F3F4F6" },
  field: { marginBottom: 14, },
  label: { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #d80891", borderRadius: 9, fontSize: 14, boxSizing: "border-box", outline: "none", background: "#FAFAFA" },
  select: { width: "100%", padding: "9px 12px", border: "1px solid #d80891", borderRadius: 9, fontSize: 14, boxSizing: "border-box", outline: "none", background: "#FAFAFA" },
  textarea: { width: "100%", padding: "9px 12px", border: "1px solid #d80891", borderRadius: 9, fontSize: 14, resize: "vertical", minHeight: 80, boxSizing: "border-box", outline: "none", background: "#FAFAFA" },
  emptyState: { gridColumn: "1/-1", textAlign: "center", padding: "48px 0", color: "#9CA3AF" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#ff0000", lineHeight: 1, padding: 4 },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 4 },
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function LostFoundPage({ darkMode }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);


const [editing, setEditing] = useState({
  reportType: false,
  status: false,
  name: false,
  description: false,
  category: false,
  location: false,
  date: false,
  contact: false,
});

const [editValue, setEditValue] = useState({
  reportType: "",
  status: "",
  name: "",
  description: "",
  category: "",
  categoryOther: "",
  location: "",
  date: "",
  contact: "",
});

useEffect(() => {
  if (viewItem) {
    const isCustomCategory =
      viewItem.category && !CATEGORIES.includes(viewItem.category);

    setEditValue({
      reportType: viewItem.reportType || "Lost",
      status: viewItem.status || "Pending",
      name: viewItem.itemName || "",
      description: viewItem.description || "",
      category: isCustomCategory ? "Others" : (viewItem.category || ""),
      categoryOther: isCustomCategory ? viewItem.category : "",
      location: viewItem.location || "",
      date: viewItem.date || "",
      contact: viewItem.contactNumber || "",
    });

    setEditing({
      reportType: false,
      status: false,
      name: false,
      description: false,
      category: false,
      location: false,
      date: false,
      contact: false,
    });
  }
}, [viewItem]);


  // ── Firestore: real-time listener ─────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "lost_found"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.itemName?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q);
    const matchType = filterType === "All" || item.reportType === filterType;
    const matchStatus = filterStatus === "All" || item.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total: items.length,
    lost: items.filter((i) => i.reportType === "Lost").length,
    found: items.filter((i) => i.reportType === "Found").length,
    claimed: items.filter((i) => i.status === "Claimed").length,
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

const handleImage = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const MAX_SIZE = 3 * 1024 * 1024; // 3MB

  if (file.size > MAX_SIZE) {
    alert("Image size must not exceed 3MB.");
    e.target.value = "";
    return;
  }

  setForm((f) => ({
    ...f,
    imageFile: file,
  }));

  const reader = new FileReader();
  reader.onload = (ev) => setImagePreview(ev.target.result);
  reader.readAsDataURL(file);
};

const validate = () => {
  const errs = {};

  // Required fields
  if (!form.itemName.trim())
    errs.itemName = "Item name is required.";

  if (!form.category)
  errs.category = "Category is required.";


  if (form.category === "Others" && !form.categoryOther.trim())
  errs.categoryOther = "Please specify the category.";

  if (!form.description.trim())
    errs.description = "Description is required.";

  if (!form.location.trim())
    errs.location = "Location is required.";

  if (!form.date)
    errs.date = "Date is required.";

  // Item Name: letters & spaces only
  if (
    form.itemName &&
    !/^[A-Za-z\s]+$/.test(form.itemName)
  ) {
    errs.itemName =
      "Item name must contain letters only.";
  }

  // Location: letters & spaces only
  if (
    form.location &&
    !/^[A-Za-z\s]+$/.test(form.location)
  ) {
    errs.location =
      "Location must contain letters only.";
  }

  // Contact Number (optional)
  if (
    form.contactNumber &&
    !/^09\d{9}$/.test(form.contactNumber)
  ) {
    errs.contactNumber =
      "Enter a valid 11-digit mobile number.";
  }

  // No future dates
  if (form.date) {
    const today = new Date().toISOString().split("T")[0];

    if (form.date > today) {
      errs.date =
        "Future dates are not allowed.";
    }
  }

  return errs;
};

  const handleAdd = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setUploading(true);

    try {
      let imageUrl = null;
      let imagePath = null;

        const finalCategory =
        form.category === "Others" && form.categoryOther.trim()
        ? form.categoryOther.trim()
        : form.category;

      if (form.imageFile) {
        imagePath = `lost_found/${Date.now()}_${form.imageFile.name}`;

        const storageRef = ref(storage, imagePath);

        await uploadBytes(storageRef, form.imageFile);

        imageUrl = await getDownloadURL(storageRef);
      }

      // Firestore: save document
        const docRef = await addDoc(collection(db, "lost_found"), {
          reportType: form.reportType,
          itemName: form.itemName.trim(),
          category: finalCategory,
          description: form.description.trim(),
          location: form.location.trim(),
          date: form.date,
          status: form.status,
          contactNumber: form.contactNumber.trim(),
          imageUrl,
          imagePath,
          createdAt: serverTimestamp(),
        });

      await logAudit({
        action: "Added Lost & Found Item",
        module: "Lost & Found",
        documentId: docRef.id,
        documentTitle: form.itemName.trim(),
        performedBy: getCurrentUser(),
        newData: {
          reportType: form.reportType,
          itemName: form.itemName.trim(),
          category: finalCategory,
          description: form.description.trim(),
          location: form.location.trim(),
          date: form.date,
          status: form.status,
          contactNumber: form.contactNumber.trim(),
        },
        description: `${form.reportType} item "${form.itemName.trim()}" was reported.`,
      });

      closeAdd();
    } catch (err) {
      console.error("Error saving report:", err);
      alert("Failed to save report. Please try again.");
    } finally {
      setUploading(false);
    }
  };

    const handleDelete = async () => {
      if (!deleteTarget) return;

      setDeleteLoading(true);

      try {
        // Delete image from Storage
        if (deleteTarget.imagePath) {
          try {
            const imageRef = ref(storage, deleteTarget.imagePath);
            await deleteObject(imageRef);
          } catch (storageErr) {
            console.error("Storage delete error:", storageErr);
          }
        }

        // Delete Firestore document
        await deleteDoc(
          doc(db, "lost_found", deleteTarget.id)
        );

        await logAudit({
          action: "Deleted Lost & Found Item",
          module: "Lost & Found",
          documentId: deleteTarget.id,
          documentTitle: deleteTarget.itemName || "",
          performedBy: getCurrentUser(),
          oldData: deleteTarget,
          description: `${deleteTarget.reportType || ""} item "${deleteTarget.itemName || ""}" was deleted.`,
        });

        setDeleteTarget(null);
      } catch (err) {
        console.error("Error deleting:", err);
        alert("Failed to delete. Please try again.");
      } finally {
        setDeleteLoading(false);
      }
    };


    const updateField = async (field, firestoreField) => {
  const value = editValue[field];

  await updateDoc(
    doc(db, "lost_found", viewItem.id),
    {
      [firestoreField]: value,
    }
  );

  setViewItem((prev) => ({
    ...prev,
    [firestoreField]: value,
  }));

  setEditing((prev) => ({
    ...prev,
    [field]: false,
  }));
};
  const closeAdd = () => {
    setShowAddModal(false);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setErrors({});
  };

  // ── Render ────────────────────────────────────────────────────────────────
return (
  <div
  className={`h-screen overflow-hidden w-full px-4 md:px-6 lg:px-8 flex flex-col ${
    darkMode ? "bg-gray-950 text-white" : "bg-gray-50"
  }`}
>

    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 mt-4 md:mt-6 lg:mt-8">
    <div className="flex flex-col gap-2.5">
  <div className="flex items-center gap-2.5 flex-wrap">
    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
      Lost &amp; Found
    </h1>

    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
        darkMode
          ? "bg-pink-500/15 text-pink-300 border border-pink-500/30"
          : "bg-pink-100 text-pink-600 border border-pink-200"
      }`}
    >
      Report Management
    </span>
  </div>

  <p
    className={`text-sm sm:text-base ${
      darkMode ? "text-slate-300" : "text-gray-500"
    }`}
  >
    Track and manage lost and found reports
  </p>
</div>

      <button
        onClick={() => setShowAddModal(true)}
          className={`px-5 py-2.5 rounded-xl font-semibold transition ${
              darkMode
                ? "bg-pink-600 hover:bg-pink-500 text-white"
                : "bg-pink-600 hover:bg-pink-500 text-white"
            }`}
      >
        ＋ Add Report
      </button>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Total Reports", value: stats.total, accent: "#6B7280" },
        { label: "Lost", value: stats.lost, accent: "#EF4444" },
        { label: "Found", value: stats.found, accent: "#10B981" },
        { label: "Claimed", value: stats.claimed, accent: "#3B82F6" },
      ].map(({ label, value, accent }) => (
          <div
            key={label}
            className={`border rounded-xl p-4 ${
              darkMode
                ? "bg-gray-900 border-gray-700"
                : "bg-white border-gray-200"
            }`}
            style={{
              borderLeft: `4px solid ${accent}`,
            }}
          >
            <p
              className={`text-2xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {loading ? "—" : value}
            </p>

            <p
              className={`text-xs uppercase tracking-wider ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {label}
            </p>
          </div>
      ))}
    </div>

    {/* Search & Filters */}
    <div className="flex flex-col lg:flex-row gap-3 mb-6">
      <div className="relative flex-1">
          <span
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            🔍
          </span>
          <input
            className={`w-full pl-10 pr-4 py-3 border rounded-2xl text-sm outline-none focus:ring-2 ${
              darkMode
                ? "bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:ring-pink-500"
                : "bg-gray-50 border-fuchsia-500 focus:ring-pink-300"
            }`}
            placeholder="Search item, location, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
      </div>

      {["All", "Lost", "Found"].map((t) => (
        <button
          key={t}
          onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition
            ${
              filterType === t
                ? "bg-pink-500 border-pink-500 text-white"
                : darkMode
                ? "bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800"
                : "border-gray-300 text-gray-600 bg-white"
            }`}
        >
          {t}
        </button>
      ))}

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`border rounded-xl px-4 py-2 text-sm min-w-[130px] ${
                darkMode
                  ? "bg-gray-900 border-gray-700 text-white"
                  : "bg-white border-gray-300"
              }`}
            >
        {["All", "Pending", "Claimed"].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </div>

   {/* Cards */}
<div className="flex-1 overflow-y-auto">
  <div
    className="
    grid
    grid-cols-1
    sm:grid-cols-2
    lg:grid-cols-3
    xl:grid-cols-4
    gap-4
    pb-6
    pt-1
  "
  >
      {loading ? (
        <div
              className={`col-span-full text-center py-12 ${
                darkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
          <div className="text-4xl">⏳</div>
          <p className="mt-2">Loading reports…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="col-span-full text-center py-12 text-gray-400">
          <div className="text-5xl">🔍</div>
          <p className="mt-2">No reports match your filters.</p>
        </div>
      ) : (
        filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setViewItem(item)}
                className={`border-2 rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${
                  darkMode
                    ? "bg-gray-900 border-pink-600 hover:bg-gray-800"
                    : "bg-white border-fuchsia-500"
                }`}
              >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.itemName}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div
                  className={`h-40 flex items-center justify-center text-4xl ${
                    darkMode
                      ? "bg-gray-800"
                      : "bg-gradient-to-br from-pink-100 to-blue-100"
                  }`}
                >
                {EMOJI[item.category] || "📦"}
              </div>
            )}

            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                <Badge
                  label={item.reportType}
                  config={TYPE_CONFIG[item.reportType]}
                />

                <Badge
                  label={item.status}
                  config={
                    STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending
                  }
                />
              </div>

                <p
                  className={`font-bold truncate mt-2 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {item.itemName}
                </p>
                  <p
                    className={`text-xs flex items-center gap-1 mt-1 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    📍 {item.location}
                  </p>

                    <p
                      className={`text-xs flex items-center gap-1 mt-1 ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      🗓 {item.date || "—"}
                    </p>

              {item.category && (
                <div className="mt-2">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      darkMode
                        ? "bg-gray-700 text-gray-200"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.category}
                  </span>
                </div>
              )}

              
            </div>
          </div>
        ))
      )}
  </div>
</div>

      {/* ── Add Report Modal ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ ...S.overlay,   background: darkMode  ? "rgba(0,0,0,0.85)"  : "rgba(0,0,0,0.55)", }}
            onClick={(e) => e.target === e.currentTarget && closeAdd()}
          >
          <div
              style={{
                ...S.modal,
                background: darkMode ? "#111827" : "#FFFFFF",
                color: darkMode ? "#F9FAFB" : "#111827",
                border: darkMode
                  ? "1px solid #374151"
                  : "1px solid #E5E7EB",
              }}
            >
            <div  style={{ ...S.modalHeader, background: darkMode ? "#111827" : "#FFFFFF",  color: darkMode ? "#F9FAFB" : "#111827",   border: darkMode
              ? "1px solid #374151"
              : "1px solid #E5E7EB",
          }}>
              <h2 style={S.modalTitle}>Add Report</h2>
              <button style={S.closeBtn} onClick={closeAdd}>✕</button>
            </div>
            <div style={S.modalBody}>

              {/* Report Type Toggle */}
              <div style={S.field}>
                <label style={{
                    ...S.label,
                    color: darkMode ? "#E5E7EB" : "#374151",
                  }}>Report Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Lost", "Found"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, reportType: t }))}
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 9, fontWeight: 700,
                        fontSize: 14, cursor: "pointer", border: "1.5px solid",
                        background: form.reportType === t
                          ? t === "Lost" ? "#FEE2E2" : "#D1FAE5"
                          : "transparent",
                        borderColor: form.reportType === t
                          ? t === "Lost" ? "#EF4444" : "#10B981"
                          : "#E5E7EB",
                        color: form.reportType === t
                          ? t === "Lost" ? "#991B1B" : "#065F46"
                          : "#9CA3AF",
                      }}
                    >
                      {t === "Lost" ? "😢 Lost" : "✅ Found"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Name */}
              <div style={S.field}>
                <label style={S.label}>Item Name *</label>
                <input
                    name="itemName"
                    value={form.itemName}
                    maxLength={40}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^A-Za-z\s]/g, "");

                      setForm((prev) => ({
                        ...prev,
                        itemName: value,
                      }));
                    }}
                      style={{
                        ...S.input,
                        background: darkMode ? "#1F2937" : "#FFFFFF",
                        color: darkMode ? "#F9FAFB" : "#111827",
                        borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                      }}
                  />
                {errors.itemName && <p style={S.errorText}>{errors.itemName}</p>}
              </div>

              {/* Category */}
              <div style={S.field}>
                <label style={S.label}>Category *</label>
                <select name="category" value={form.category} onChange={handleChange} style={{
                    ...S.select,
                    background: darkMode ? "#1F2937" : "#FFFFFF",
                    color: darkMode ? "#F9FAFB" : "#111827",
                    borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                  }}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  
                </select>
                {errors.category && (
                    <p style={S.errorText}>{errors.category}</p>
                  )}

                  {form.category === "Others" && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        name="categoryOther"
                        placeholder="Specify category"
                        value={form.categoryOther}
                        maxLength={30}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^A-Za-z\s]/g, "");
                          setForm((prev) => ({ ...prev, categoryOther: value }));
                        }}
                        style={{
                          ...S.input,
                          background: darkMode ? "#1F2937" : "#FFFFFF",
                          color: darkMode ? "#F9FAFB" : "#111827",
                          borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                        }}
                      />
                      {errors.categoryOther && (
                        <p style={S.errorText}>{errors.categoryOther}</p>
                      )}
                    </div>
                  )}

              </div>

              {/* Description */}
              <div style={S.field}>
                <label style={S.label}>Description *</label>
                <textarea
                  name="description"
                  placeholder="Describe the item in detail…"
                  value={form.description}
                  onChange={handleChange}
                  style={{
                    ...S.textarea,
                    background: darkMode ? "#1F2937" : "#FFFFFF",
                    color: darkMode ? "#F9FAFB" : "#111827",
                    borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                  }}
                />

                   {errors.description && (
                      <p style={S.errorText}>{errors.description}</p>
                    )}
              </div>

              {/* Location & Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={S.field}>
                  <label style={S.label}>Location *</label>
                    <input
                      name="location"
                      value={form.location}
                      maxLength={50}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^A-Za-z\s]/g, "");

                        setForm((prev) => ({
                          ...prev,
                          location: value,
                        }));
                      }}
                        style={{
                          ...S.input,
                          background: darkMode ? "#1F2937" : "#FFFFFF",
                          color: darkMode ? "#F9FAFB" : "#111827",
                          borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                        }}
                    />

                    {errors.location && (
                      <p style={S.errorText}>{errors.location}</p>
                    )}
                </div>
                <div style={S.field}>
                  <label style={S.label}>Date</label>
                  <input
                      type="date"
                      name="date"
                      value={form.date}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={handleChange}
                        style={{
                          ...S.input,
                          background: darkMode ? "#1F2937" : "#FFFFFF",
                          color: darkMode ? "#F9FAFB" : "#111827",
                          borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                        }}
                    />

                    {errors.date && (
                      <p style={S.errorText}>{errors.date}</p>
                    )}
                </div>
              </div>

              {/* Contact & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={S.field}>
                  <label style={S.label}>Contact Number (optional) </label>

                  <input
                    type="text"
                    name="contactNumber"
                    placeholder="09XXXXXXXXX"
                    value={form.contactNumber}
                    maxLength={11}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");

                      setForm((prev) => ({
                        ...prev,
                        contactNumber: value,
                      }));
                    }}
                    style={{
                      ...S.input,
                      background: darkMode ? "#1F2937" : "#FFFFFF",
                      color: darkMode ? "#F9FAFB" : "#111827",
                      borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                    }}
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Status</label>
                  <select name="status" value={form.status} onChange={handleChange} style={{
                          ...S.select,
                          background: darkMode ? "#1F2937" : "#FFFFFF",
                          color: darkMode ? "#F9FAFB" : "#111827",
                          borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                        }}>
                    <option>Pending</option>
                    <option>Claimed</option>
                  </select>
                </div>
              </div>

              {/* Image Upload */}
              <div style={S.field}>
                <label style={S.label}>Photo (optional)</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: "2px dashed #E5E7EB", borderRadius: 10, padding: "18px",
                    textAlign: "center", cursor: "pointer", background: "#FAFAFA",
                    transition: "border-color .15s",
                  }}

                  
                  
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#EC4899")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 8, objectFit: "cover" }}
                    />
                  ) : (
                    <>
                      <div style={{ fontSize: 28 }}>📷</div>
                      <p style={{ fontSize: 13, color: "#9CA3AF", margin: "6px 0 0" }}>
                        Click to upload a photo
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  onChange={handleImage}
                  style={{ display: "none" }}
                />
              </div>

            </div>
            <div style={S.modalFooter}>
              <button style={S.btn("secondary")} onClick={closeAdd} disabled={uploading}>
                Cancel
              </button>
              <button
                style={{ ...S.btn("primary"), opacity: uploading ? 0.6 : 1 }}
                onClick={handleAdd}
                disabled={uploading}
              >
                {uploading ? "Adding" : "Add Report"}
              </button>
            </div>
          </div>
        </div>
      )}

     {/* ── View Modal ───────────────────────────────────────────────────────── */}
      {viewItem && (
        <div
          style={{
            ...S.overlay,
            background: darkMode
              ? "rgba(0,0,0,.85)"
              : "rgba(0,0,0,.55)",
          }}
          onClick={(e) =>
            e.target === e.currentTarget && setViewItem(null)
          }
        >
          <div
              style={{
                ...S.modal,
                maxWidth: 480,
                background: darkMode ? "#111827" : "#fff",
                color: darkMode ? "#F9FAFB" : "#111827",
                border: darkMode
                  ? "1px solid #374151"
                  : "1px solid #E5E7EB",
              }}
            >
            
            {/* HEADER */}
            <div
                style={{
                  ...S.modalHeader,
                  background: darkMode ? "#111827" :"#F9FAFB" ,
                }}
              >
              <h2
                  style={{
                    ...S.modalTitle,
                    fontSize: 16,
                    color: darkMode ? "#F9FAFB" : "#111827",
                  }}
                >
                Report Details
              </h2>
              <button
                style={S.closeBtn}
                onClick={() => setViewItem(null)}
              >
                ✕
              </button>
            </div>

            {/* IMAGE */}
            {viewItem.imageUrl ? (
              <img
                src={viewItem.imageUrl}
                alt={viewItem.itemName}
                style={{
                  width: "100%",
                  maxHeight: 220,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  ...S.cardImgPlaceholder,
                  height: 100,
                  fontSize: 48,
                }}
              >
                {EMOJI[viewItem.category] || "📦"}
              </div>
            )}

            {/* BODY */}
            <div style={S.modalBody}>
              
              {/* BADGES ROW */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {/* REPORT TYPE (EDITABLE) */}
                {editing.reportType ? (
                  <select
                    value={editValue.reportType}
                    onChange={async (e) => {
                      const value = e.target.value;

                      setEditValue((prev) => ({
                        ...prev,
                        reportType: value,
                      }));

                      await updateDoc(doc(db, "lost_found", viewItem.id), {
                        reportType: value,
                      });

                      await logAudit({
                        action: "Edited Lost & Found Item",
                        module: "Lost & Found",
                        documentId: viewItem.id,
                        documentTitle: viewItem.itemName || "",
                        performedBy: getCurrentUser(),
                        oldData: { reportType: viewItem.reportType },
                        newData: { reportType: value },
                        description: `Report type of "${viewItem.itemName}" changed to ${value}.`,
                      });

                      setViewItem((prev) => ({
                        ...prev,
                        reportType: value,
                      }));

                      setEditing((prev) => ({
                        ...prev,
                        reportType: false,
                      }));
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      color: "#111827",
                      background: darkMode ? "#1F2937" : "#fff",
                      color: darkMode ? "#F9FAFB" : "#111827",
                      border: `1px solid ${
                        darkMode ? "#4B5563" : "#ddd"
                      }`,
                    }}
                  >
                    <option value="Lost">Lost</option>
                    <option value="Found">Found</option>
                  </select>
                ) : (
                  <span
                    onClick={() =>
                      setEditing((prev) => ({
                        ...prev,
                        reportType: true,
                      }))
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <Badge
                      label={viewItem.reportType}
                      config={TYPE_CONFIG[viewItem.reportType]}
                    />
                  </span>
                )}

                {/* STATUS (EDITABLE) */}
                {editingStatus ? (
                  <select
                    value={newStatus}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setNewStatus(value);

                      await updateDoc(
                        doc(db, "lost_found", viewItem.id),
                        { status: value }
                      );

                      await logAudit({
                        action: "Edited Lost & Found Item",
                        module: "Lost & Found",
                        documentId: viewItem.id,
                        documentTitle: viewItem.itemName || "",
                        performedBy: getCurrentUser(),
                        oldData: { status: viewItem.status },
                        newData: { status: value },
                        description: `Status of "${viewItem.itemName}" changed to ${value}.`,
                      });

                      setViewItem((prev) => ({
                        ...prev,
                        status: value,
                      }));

                      setEditingStatus(false);
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      background: darkMode ? "#1F2937" : "#fff",
                      color: darkMode ? "#F9FAFB" : "#111827",
                      border: `1px solid ${
                        darkMode ? "#4B5563" : "#ddd"
                      }`,
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Claimed">Claimed</option>


                  </select>
                ) : (
                  <span
                    onClick={() => setEditingStatus(true)}
                    style={{ cursor: "pointer" }}
                  >
                    <Badge
                      label={viewItem.status}
                      config={
                        STATUS_CONFIG[viewItem.status] ||
                        STATUS_CONFIG.Pending
                      }
                    />
                  </span>
                )}

            {/* CATEGORY (EDITABLE) */}
              {editing.category ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <select
                    value={editValue.category}
                    onChange={async (e) => {
                      const value = e.target.value;

                      if (value === "Others") {
                        // wait for the custom text instead of saving immediately
                        setEditValue((prev) => ({ ...prev, category: value }));
                        return;
                      }

                      setEditValue((prev) => ({ ...prev, category: value, categoryOther: "" }));

                      await updateDoc(doc(db, "lost_found", viewItem.id), { category: value });

                      await logAudit({
                        action: "Edited Lost & Found Item",
                        module: "Lost & Found",
                        documentId: viewItem.id,
                        documentTitle: viewItem.itemName || "",
                        performedBy: getCurrentUser(),
                        oldData: { category: viewItem.category },
                        newData: { category: value },
                        description: `Category of "${viewItem.itemName}" changed to ${value}.`,
                      });

                      setViewItem((prev) => ({ ...prev, category: value }));
                      setEditing((prev) => ({ ...prev, category: false }));
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 999,
                      color: darkMode ? "#F9FAFB" : "#111827",
                      background: darkMode ? "#1F2937" : "#fff",
                      border: `1px solid ${darkMode ? "#4B5563" : "#ddd"}`,
                    }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {editValue.category === "Others" && (
                    <input
                      autoFocus
                      placeholder="Specify category"
                      value={editValue.categoryOther}
                      maxLength={30}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^A-Za-z\s]/g, "");
                        setEditValue((prev) => ({ ...prev, categoryOther: value }));
                      }}
                      onBlur={async () => {
                        const custom = editValue.categoryOther.trim();
                        if (!custom) return;

                        await updateDoc(doc(db, "lost_found", viewItem.id), { category: custom });

                        await logAudit({
                          action: "Edited Lost & Found Item",
                          module: "Lost & Found",
                          documentId: viewItem.id,
                          documentTitle: viewItem.itemName || "",
                          performedBy: getCurrentUser(),
                          oldData: { category: viewItem.category },
                          newData: { category: custom },
                          description: `Category of "${viewItem.itemName}" changed to ${custom}.`,
                        });

                        setViewItem((prev) => ({ ...prev, category: custom }));
                        setEditing((prev) => ({ ...prev, category: false }));
                      }}
                      style={{
                        fontSize: 12,
                        padding: "5px 10px",
                        borderRadius: 8,
                        background: darkMode ? "#1F2937" : "#fff",
                        color: darkMode ? "#F9FAFB" : "#111827",
                        border: `1px solid ${darkMode ? "#4B5563" : "#ddd"}`,
                      }}
                    />
                  )}
                </div>
              ) : (
                <span
                  onClick={() =>
                    setEditing((prev) => ({ ...prev, category: true }))
                  }
                  style={{
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 99,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    background: darkMode ? "#374151" : "#F3F4F6",
                    color: darkMode ? "#F9FAFB" : "#111827",
                  }}
                >
                  {viewItem.category}
                </span>
              )}
              </div>

              {/* TITLE */}
                {editing.name ? (
                  <input
                    value={editValue.name}
                    onChange={(e) =>
                      setEditValue((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    onBlur={async () => {
                      await updateDoc(doc(db, "lost_found", viewItem.id), {
                        itemName: editValue.name,
                      });

                      await logAudit({
                        action: "Edited Lost & Found Item",
                        module: "Lost & Found",
                        documentId: viewItem.id,
                        documentTitle: editValue.name || viewItem.itemName || "",
                        performedBy: getCurrentUser(),
                        oldData: { itemName: viewItem.itemName },
                        newData: { itemName: editValue.name },
                        description: `Item name changed from "${viewItem.itemName}" to "${editValue.name}".`,
                      });

                      setViewItem((prev) => ({
                        ...prev,
                        itemName: editValue.name,
                      }));

                      setEditing((prev) => ({
                        ...prev,
                        name: false,
                      }));
                    }}
                    autoFocus
                    style={{
                      width: "100%",
                      fontSize: 18,
                      fontWeight: 700,
                      borderRadius: 8,
                      padding: 8,
                      background: darkMode ? "#1F2937" : "#fff",
                      color: darkMode ? "#F9FAFB" : "#111827",
                      border: `1px solid ${
                        darkMode ? "#4B5563" : "#D1D5DB"
                      }`,
                    }}
                  />
                ) : (
                  <h3
                    onClick={() =>
                      setEditing((prev) => ({
                        ...prev,
                        name: true,
                      }))
                    }
                    style={{
                      fontWeight:700,
                      fontSize:18,
                      margin:"0 0 10px",
                      cursor:"pointer",
                      color: darkMode ? "#F9FAFB" : "#111827",
                    }}
                  >
                    {viewItem.itemName}
                  </h3>
                )}

              {/* DESCRIPTION */}
                {editing.description ? (
                  <textarea
                    value={editValue.description}
                    onChange={(e) =>
                      setEditValue((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    onBlur={async () => {
                      await updateDoc(doc(db, "lost_found", viewItem.id), {
                        description: editValue.description,
                      });

                      await logAudit({
                        action: "Edited Lost & Found Item",
                        module: "Lost & Found",
                        documentId: viewItem.id,
                        documentTitle: viewItem.itemName || "",
                        performedBy: getCurrentUser(),
                        oldData: { description: viewItem.description },
                        newData: { description: editValue.description },
                        description: `Description of "${viewItem.itemName}" was updated.`,
                      });

                      setViewItem((prev) => ({
                        ...prev,
                        description: editValue.description,
                      }));

                      setEditing((prev) => ({
                        ...prev,
                        description: false,
                      }));
                    }}
                    autoFocus
                      style={{
                        width:"100%",
                        minHeight:80,
                        padding:8,
                        borderRadius:8,
                        background: darkMode ? "#1F2937" : "#fff",
                        color: darkMode ? "#F9FAFB" : "#111827",
                        border:`1px solid ${
                          darkMode ? "#4B5563" : "#D1D5DB"
                        }`,
                      }}
                  />
                ) : (
                  <p
                    onClick={() =>
                      setEditing((prev) => ({
                        ...prev,
                        description: true,
                      }))
                    }
                    style={{
                      fontSize:14,
                      lineHeight:1.6,
                      cursor:"pointer",
                      margin:"0 0 14px",
                      color: darkMode ? "#D1D5DB" : "#374151",
                    }}
                  >
                    {viewItem.description || "No description"}
                  </p>
                )}

              {/* INFO */}
              <div
        style={{
          borderTop: `1px solid ${
              darkMode ? "#374151" : "#F3F4F6"
            }`,
          paddingTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >

        {/* Location */}
        <div>
          <span style={{ color: darkMode ? "#ffffff" : "#000000", fontSize: 14 }}>📍 Location</span>

          {editing.location ? (
            <input
              value={editValue.location}
              onChange={(e) =>
                setEditValue((p) => ({
                  ...p,
                  location: e.target.value,
                }))
              }
              onBlur={async () => {
                await updateDoc(doc(db, "lost_found", viewItem.id), {
                  location: editValue.location,
                });

                await logAudit({
                  action: "Edited Lost & Found Item",
                  module: "Lost & Found",
                  documentId: viewItem.id,
                  documentTitle: viewItem.itemName || "",
                  performedBy: getCurrentUser(),
                  oldData: { location: viewItem.location },
                  newData: { location: editValue.location },
                  description: `Location of "${viewItem.itemName}" was updated.`,
                });

                setViewItem((p) => ({
                  ...p,
                  location: editValue.location,
                }));

                setEditing((p) => ({
                  ...p,
                  location: false,
                }));
              }}
              autoFocus
              style={{
                ...S.input,
                background: darkMode ? "#1F2937" : "#FFFFFF",
                color: darkMode ? "#F9FAFB" : "#111827",
                borderColor: darkMode ? "#4B5563" : "#E5E7EB",
              }}
            />
          ) : (
            <div
              onClick={() =>
                setEditing((p) => ({
                  ...p,
                  location: true,
                }))
              }
              style={{
                color: darkMode ? "#E5E7EB" : "#111827",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {viewItem.location}
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <span style={{  color: darkMode ? "#ffffff" : "#000000", fontSize: 14 }}>🗓 Date</span>

          {editing.date ? (
            <input
              type="date"
              value={editValue.date}
              onChange={(e) =>
                setEditValue((p) => ({
                  ...p,
                  date: e.target.value,
                }))
              }
              onBlur={async () => {
                await updateDoc(doc(db, "lost_found", viewItem.id), {
                  date: editValue.date,
                });

                await logAudit({
                  action: "Edited Lost & Found Item",
                  module: "Lost & Found",
                  documentId: viewItem.id,
                  documentTitle: viewItem.itemName || "",
                  performedBy: getCurrentUser(),
                  oldData: { date: viewItem.date },
                  newData: { date: editValue.date },
                  description: `Date of "${viewItem.itemName}" was updated.`,
                });

                setViewItem((p) => ({
                  ...p,
                  date: editValue.date,
                }));

                setEditing((p) => ({
                  ...p,
                  date: false,
                }));
              }}
              autoFocus
              style={{
                ...S.input,
                background: darkMode ? "#1F2937" : "#FFFFFF",
                color: darkMode ? "#F9FAFB" : "#111827",
                borderColor: darkMode ? "#4B5563" : "#E5E7EB",
              }}
            />
          ) : (
            <div
              onClick={() =>
                setEditing((p) => ({
                  ...p,
                  date: true,
                }))
              }
              style={{
                  color: darkMode ? "#E5E7EB" : "#111827",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {viewItem.date}
            </div>
          )}
        </div>

        {/* Contact */}
        <div>
          <span style={{ color: darkMode ? "#ffffff" : "#000000", fontSize: 14 }}>📞 Contact</span>

          {editing.contact ? (
            <input
              value={editValue.contact}
              onChange={(e) =>
                setEditValue((p) => ({
                  ...p,
                  contact: e.target.value,
                }))
              }
              onBlur={async () => {
                await updateDoc(doc(db, "lost_found", viewItem.id), {
                  contactNumber: editValue.contact,
                });

                await logAudit({
                  action: "Edited Lost & Found Item",
                  module: "Lost & Found",
                  documentId: viewItem.id,
                  documentTitle: viewItem.itemName || "",
                  performedBy: getCurrentUser(),
                  oldData: { contactNumber: viewItem.contactNumber },
                  newData: { contactNumber: editValue.contact },
                  description: `Contact number of "${viewItem.itemName}" was updated.`,
                });

                setViewItem((p) => ({
                  ...p,
                  contactNumber: editValue.contact,
                }));

                setEditing((p) => ({
                  ...p,
                  contact: false,
                }));
              }}
              autoFocus
              style={{
                  ...S.input,
                  background: darkMode ? "#1F2937" : "#FFFFFF",
                  color: darkMode ? "#F9FAFB" : "#111827",
                  borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                }}
            />
          ) : (
            <div
              onClick={() =>
                setEditing((p) => ({
                  ...p,
                  contact: true,
                }))
              }
              style={{
                  color: darkMode ? "#E5E7EB" : "#111827",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {viewItem.contactNumber}
            </div>
          )}
        </div>

      </div>
            </div>

            {/* FOOTER */}
                <div
                  style={{
                    ...S.modalFooter,
                        justifyContent: "flex-end",
                        gap: 8,
                    borderTop:`1px solid ${
                      darkMode ? "#374151" : "#E5E7EB"
                    }`,
                  }}
                >
   

              {/* RIGHT: ACTIONS */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                 style={{
                    ...S.btn("danger"),
                    border: darkMode ? "1px solid #7F1D1D" : undefined,
                  }}
                  onClick={() => {
                    setDeleteTarget(viewItem);
                    setViewItem(null);
                  }}
                >
                  🗑 Delete
                </button>

                <button
                  style={{
                        ...S.btn("secondary"),
                        background: darkMode ? "#374151" : "#F3F4F6",
                        color: darkMode ? "#F9FAFB" : "#374151",
                      }}
                  onClick={() => setViewItem(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* ── Delete Confirm Modal ──────────────────────────────────────────────── */}
            {deleteTarget && (
              <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && !deleteLoading && setDeleteTarget(null)}>
                <div style={{ ...S.modal, maxWidth: 380 }}>
                  <div style={{ padding: "28px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
                    <h2 style={{ fontWeight: 700, fontSize: 17, margin: "0 0 8px" }}>Delete Report?</h2>
                    <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 24px" }}>
                      "<strong>{deleteTarget.itemName}</strong>" will be permanently removed.
                    </p>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                      <button
                        style={S.btn("secondary")}
                        onClick={() => setDeleteTarget(null)}
                        disabled={deleteLoading}
                      >
                        Cancel
                      </button>
                      <button
                        style={{ ...S.btn("danger"), opacity: deleteLoading ? 0.6 : 1 }}
                        onClick={handleDelete}
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? "Deleting…" : "Yes, Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

    </div>
  );
}