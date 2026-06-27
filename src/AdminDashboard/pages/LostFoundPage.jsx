import { useState, useEffect, useRef } from "react";
import { db, storage } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL,  deleteObject } from "firebase/storage";
import { color } from "framer-motion";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Electronics", "Documents", "Accessories", "Clothing",
  "Bags & Wallets", "Keys", "Jewelry", "Books", "Others",
];

const STATUS_CONFIG = {
  Pending:  { bg: "#FEF3C7", color: "#92400E", dot: "#D97706" },
  Claimed:  { bg: "#D1FAE5", color: "#065F46", dot: "#059669" },
  Resolved: { bg: "#DBEAFE", color: "#1E40AF", dot: "#3B82F6" },
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
  location: "", date: "", status: "Pending", contactNumber: "", imageFile: null,
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
    background: variant === "primary" ? "#EC4899" : variant === "danger" ? "#EF4444" : "#F3F4F6",
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
  input: { width: "100%", padding: "9px 12px", border: "1px solid #000000", borderRadius: 9, fontSize: 14, boxSizing: "border-box", outline: "none", background: "#FAFAFA" },
  select: { width: "100%", padding: "9px 12px", border: "1px solid #000000", borderRadius: 9, fontSize: 14, boxSizing: "border-box", outline: "none", background: "#FAFAFA" },
  textarea: { width: "100%", padding: "9px 12px", border: "1px solid #000000", borderRadius: 9, fontSize: 14, resize: "vertical", minHeight: 80, boxSizing: "border-box", outline: "none", background: "#FAFAFA" },
  emptyState: { gridColumn: "1/-1", textAlign: "center", padding: "48px 0", color: "#9CA3AF" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#ff0000", lineHeight: 1, padding: 4 },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 4 },
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function LostFoundPage() {
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



  useEffect(() => {
  if (viewItem) {
    setNewStatus(viewItem.status);
    setEditingStatus(false);
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
    if (!form.itemName.trim()) errs.itemName = "Item name is required.";
    if (!form.location.trim()) errs.location = "Location is required.";
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

      if (form.imageFile) {
        imagePath = `lost_found/${Date.now()}_${form.imageFile.name}`;

        const storageRef = ref(storage, imagePath);

        await uploadBytes(storageRef, form.imageFile);

        imageUrl = await getDownloadURL(storageRef);
      }

      // Firestore: save document
        await addDoc(collection(db, "lost_found"), {
          reportType: form.reportType,
          itemName: form.itemName.trim(),
          category: form.category,
          description: form.description.trim(),
          location: form.location.trim(),
          date: form.date,
          status: form.status,
          contactNumber: form.contactNumber.trim(),
          imageUrl,
          imagePath,
          createdAt: serverTimestamp(),
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

        setDeleteTarget(null);
      } catch (err) {
        console.error("Error deleting:", err);
        alert("Failed to delete. Please try again.");
      } finally {
        setDeleteLoading(false);
      }
    };

  const closeAdd = () => {
    setShowAddModal(false);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setErrors({});
  };

  // ── Render ────────────────────────────────────────────────────────────────
return (
  <div className="h-screen overflow-hidden w-full px-4 md:px-6 lg:px-8 flex flex-col">

    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 mt-4 md:mt-6 lg:mt-8">
      <div>
        <h1 className="text-2xl font-bold text-pink-600">
          Lost &amp; Found
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Track and manage lost and found reports
        </p>
      </div>

      <button
        onClick={() => setShowAddModal(true)}
        className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2.5 rounded-xl font-semibold transition"
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
          className="bg-white border border-gray-200 rounded-xl p-4"
          style={{
            borderLeft: `4px solid ${accent}`,
          }}
        >
          <p className="text-2xl font-bold text-gray-900">
            {loading ? "—" : value}
          </p>

          <p className="text-xs uppercase tracking-wider text-gray-500">
            {label}
          </p>
        </div>
      ))}
    </div>

    {/* Search & Filters */}
    <div className="flex flex-col lg:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>

        <input
          className="
          w-full
          pl-10
          pr-4
          py-3
          border
          border-fuchsia-500
          rounded-2xl
          bg-gray-50
          text-sm
          outline-none
          focus:ring-2
          focus:ring-pink-300
        "
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
              : "border-gray-300 text-gray-600 bg-white"
          }`}
        >
          {t}
        </button>
      ))}

      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="
        border
        border-gray-300
        rounded-xl
        px-4
        py-2
        text-sm
        bg-white
        min-w-[130px]
      "
      >
        {["All", "Pending", "Claimed", "Resolved"].map((s) => (
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
  "
  >
      {loading ? (
        <div className="col-span-full text-center py-12 text-gray-400">
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
            className="
            bg-white
            border-2
            border-fuchsia-500
            rounded-2xl
            overflow-hidden
            cursor-pointer
            transition-all
            hover:shadow-lg
            hover:-translate-y-1
          "
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.itemName}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="h-40 flex items-center justify-center bg-gradient-to-br from-pink-100 to-blue-100 text-4xl">
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

              <p className="font-bold text-gray-900 truncate mt-2">
                {item.itemName}
              </p>

              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                📍 {item.location}
              </p>

              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                🗓 {item.date || "—"}
              </p>

              {item.category && (
                <div className="mt-2">
                  <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded-full">
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
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && closeAdd()}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <h2 style={S.modalTitle}>Add Report</h2>
              <button style={S.closeBtn} onClick={closeAdd}>✕</button>
            </div>
            <div style={S.modalBody}>

              {/* Report Type Toggle */}
              <div style={S.field}>
                <label style={S.label}>Report Type</label>
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
                  placeholder="e.g. iPhone 15 Pro"
                  value={form.itemName}
                  onChange={handleChange}
                  style={{ ...S.input, borderColor: errors.itemName ? "#EF4444" : "#E5E7EB" }}
                />
                {errors.itemName && <p style={S.errorText}>{errors.itemName}</p>}
              </div>

              {/* Category */}
              <div style={S.field}>
                <label style={S.label}>Category</label>
                <select name="category" value={form.category} onChange={handleChange} style={S.select}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Description */}
              <div style={S.field}>
                <label style={S.label}>Description</label>
                <textarea
                  name="description"
                  placeholder="Describe the item in detail…"
                  value={form.description}
                  onChange={handleChange}
                  style={S.textarea}
                />
              </div>

              {/* Location & Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={S.field}>
                  <label style={S.label}>Location *</label>
                  <input
                    name="location"
                    placeholder="Where?"
                    value={form.location}
                    onChange={handleChange}
                    style={{ ...S.input, borderColor: errors.location ? "#EF4444" : "#E5E7EB" }}
                  />
                  {errors.location && <p style={S.errorText}>{errors.location}</p>}
                </div>
                <div style={S.field}>
                  <label style={S.label}>Date</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange} style={S.input} />
                </div>
              </div>

              {/* Contact & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={S.field}>
                  <label style={S.label}>Contact Number</label>

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
                    style={S.input}
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Status</label>
                  <select name="status" value={form.status} onChange={handleChange} style={S.select}>
                    <option>Pending</option>
                    <option>Claimed</option>
                    <option>Resolved</option>
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
                {uploading ? "Saving…" : "Save Report"}
              </button>
            </div>
          </div>
        </div>
      )}

     {/* ── View Modal ───────────────────────────────────────────────────────── */}
{viewItem && (
  <div
    style={S.overlay}
    onClick={(e) =>
      e.target === e.currentTarget && setViewItem(null)
    }
  >
    <div style={{ ...S.modal, maxWidth: 480 }}>
      
      {/* HEADER */}
      <div style={S.modalHeader}>
        <h2 style={{ ...S.modalTitle, fontSize: 16 }}>
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
          {/* REPORT TYPE */}
          <Badge
            label={viewItem.reportType}
            config={TYPE_CONFIG[viewItem.reportType]}
          />

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
              }}
            >
              <option value="Pending">Pending</option>
              <option value="Claimed">Claimed</option>
              <option value="Returned">Returned</option>
              <option value="Resolved">Resolved</option>
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

          {/* CATEGORY */}
          {viewItem.category && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: "#F3F4F6",
                color: "#4B5563",
                padding: "3px 10px",
                borderRadius: 99,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {viewItem.category}
            </span>
          )}
        </div>

        {/* TITLE */}
        <h3
          style={{
            fontWeight: 700,
            fontSize: 18,
            margin: "0 0 10px",
            color: "#111",
          }}
        >
          {viewItem.itemName}
        </h3>

        {/* DESCRIPTION */}
        {viewItem.description && (
          <p
            style={{
              fontSize: 14,
              color: "#4B5563",
              margin: "0 0 14px",
              lineHeight: 1.6,
            }}
          >
            {viewItem.description}
          </p>
        )}

        {/* INFO */}
        <div
          style={{
            borderTop: "1px solid #F3F4F6",
            paddingTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[
            ["📍 Location", viewItem.location],
            ["🗓 Date", viewItem.date],
            ["📞 Contact", viewItem.contactNumber],
          ].map(([k, v]) =>
            v ? (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#9CA3AF" }}>{k}</span>
                <span style={{ fontWeight: 600, color: "#374151" }}>
                  {v}
                </span>
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div
        style={{
          ...S.modalFooter,
          justifyContent: "space-between",
        }}
      >
        {/* LEFT: EDIT BUTTON */}
        <button
          style={{
            ...S.btn("secondary"),
            background: "#f3f4f6",
            color: "#374151",
          }}
          onClick={() => setEditingStatus(true)}
        >
          ✏ Edit Status
        </button>

        {/* RIGHT: ACTIONS */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={S.btn("danger")}
            onClick={() => {
              setDeleteTarget(viewItem);
              setViewItem(null);
            }}
          >
            🗑 Delete
          </button>

          <button
            style={S.btn("secondary")}
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
                "<strong>{deleteTarget.itemName}</strong>" will be permanently removed from Firestore.
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