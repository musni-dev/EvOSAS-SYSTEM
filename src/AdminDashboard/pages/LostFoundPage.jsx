import { useState, useEffect, useRef } from "react";
import { db, storage } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: config.bg, color: config.color,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
      padding: "3px 9px", borderRadius: 99, textTransform: "uppercase",
    }}>
      {config.dot && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: config.dot, flexShrink: 0 }} />
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
    flex: 1, minWidth: 200, padding: "9px 14px 9px 38px",
    border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 14, outline: "none",
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
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
    overflow: "hidden", cursor: "pointer", transition: "box-shadow .15s, transform .15s",
  },
  cardImg: { width: "100%", height: 150, objectFit: "cover", display: "block", background: "#F3F4F6" },
  cardImgPlaceholder: {
    height: 90, background: "linear-gradient(135deg,#FCE7F3,#DBEAFE)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
  },
  cardBody: { padding: "14px 16px" },
  cardTitle: { fontWeight: 700, fontSize: 15, margin: "8px 0 4px", color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardMeta: { fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520,
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.15)",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 20px 14px", borderBottom: "1px solid #F3F4F6",
    position: "sticky", top: 0, background: "#fff", zIndex: 1,
  },
  modalTitle: { fontWeight: 700, fontSize: 17, margin: 0 },
  modalBody: { padding: "18px 20px" },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid #F3F4F6" },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #E5E7EB", borderRadius: 9, fontSize: 14, boxSizing: "border-box", outline: "none", background: "#FAFAFA" },
  select: { width: "100%", padding: "9px 12px", border: "1px solid #E5E7EB", borderRadius: 9, fontSize: 14, boxSizing: "border-box", outline: "none", background: "#FAFAFA" },
  textarea: { width: "100%", padding: "9px 12px", border: "1px solid #E5E7EB", borderRadius: 9, fontSize: 14, resize: "vertical", minHeight: 80, boxSizing: "border-box", outline: "none", background: "#FAFAFA" },
  emptyState: { gridColumn: "1/-1", textAlign: "center", padding: "48px 0", color: "#9CA3AF" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9CA3AF", lineHeight: 1, padding: 4 },
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
    setForm((f) => ({ ...f, imageFile: file }));
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

      // Firebase Storage upload
      if (form.imageFile) {
        const storageRef = ref(
          storage,
          `lost_found/${Date.now()}_${form.imageFile.name}`
        );
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
      await deleteDoc(doc(db, "lost_found", deleteTarget.id));
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
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Lost &amp; Found</h1>
          <p style={S.subtitle}>Track and manage lost and found reports</p>
        </div>
        <button style={S.btn("primary")} onClick={() => setShowAddModal(true)}>
          ＋ Add Report
        </button>
      </div>

      {/* Stats */}
      <div style={S.statsGrid}>
        {[
          { label: "Total Reports", value: stats.total, accent: "#6B7280" },
          { label: "Lost",          value: stats.lost,  accent: "#EF4444" },
          { label: "Found",         value: stats.found, accent: "#10B981" },
          { label: "Claimed",       value: stats.claimed, accent: "#3B82F6" },
        ].map(({ label, value, accent }) => (
          <div key={label} style={S.statCard(accent)}>
            <p style={S.statNum}>{loading ? "—" : value}</p>
            <p style={S.statLabel}>{label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div style={S.controls}>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>🔍</span>
          <input
            style={S.searchBox}
            placeholder="Search item, location, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {["All", "Lost", "Found"].map((t) => (
          <button key={t} style={S.pill(filterType === t)} onClick={() => setFilterType(t)}>
            {t}
          </button>
        ))}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ ...S.select, width: "auto", minWidth: 130 }}
        >
          {["All", "Pending", "Claimed", "Resolved"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      <div style={S.grid}>
        {loading ? (
          <div style={S.emptyState}>
            <div style={{ fontSize: 36 }}>⏳</div>
            <p style={{ marginTop: 8 }}>Loading reports…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={S.emptyState}>
            <div style={{ fontSize: 48 }}>🔍</div>
            <p style={{ marginTop: 8 }}>No reports match your filters.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              style={S.card}
              onClick={() => setViewItem(item)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.1)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "none";
              }}
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.itemName} style={S.cardImg} />
              ) : (
                <div style={S.cardImgPlaceholder}>{EMOJI[item.category] || "📦"}</div>
              )}
              <div style={S.cardBody}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge label={item.reportType} config={TYPE_CONFIG[item.reportType]} />
                  <Badge label={item.status} config={STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending} />
                </div>
                <p style={S.cardTitle}>{item.itemName}</p>
                <p style={S.cardMeta}>📍 {item.location}</p>
                <p style={{ ...S.cardMeta, marginTop: 2 }}>🗓 {item.date || "—"}</p>
                {item.category && (
                  <p style={{ ...S.cardMeta, marginTop: 6 }}>
                    <span style={{
                      background: "#F3F4F6", padding: "2px 8px", borderRadius: 99,
                      fontSize: 11, fontWeight: 600, color: "#4B5563",
                    }}>
                      {item.category}
                    </span>
                  </p>
                )}
              </div>
            </div>
          ))
        )}
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
                    name="contactNumber"
                    placeholder="09XXXXXXXXX"
                    value={form.contactNumber}
                    onChange={handleChange}
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
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setViewItem(null)}>
          <div style={{ ...S.modal, maxWidth: 480 }}>
            <div style={S.modalHeader}>
              <h2 style={{ ...S.modalTitle, fontSize: 16 }}>Report Details</h2>
              <button style={S.closeBtn} onClick={() => setViewItem(null)}>✕</button>
            </div>

            {viewItem.imageUrl ? (
              <img
                src={viewItem.imageUrl}
                alt={viewItem.itemName}
                style={{ width: "100%", maxHeight: 220, objectFit: "cover" }}
              />
            ) : (
              <div style={{ ...S.cardImgPlaceholder, height: 100, fontSize: 48 }}>
                {EMOJI[viewItem.category] || "📦"}
              </div>
            )}

            <div style={S.modalBody}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <Badge label={viewItem.reportType} config={TYPE_CONFIG[viewItem.reportType]} />
                <Badge label={viewItem.status} config={STATUS_CONFIG[viewItem.status] || STATUS_CONFIG.Pending} />
                {viewItem.category && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, background: "#F3F4F6", color: "#4B5563",
                    padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {viewItem.category}
                  </span>
                )}
              </div>

              <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 10px", color: "#111" }}>
                {viewItem.itemName}
              </h3>

              {viewItem.description && (
                <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 14px", lineHeight: 1.6 }}>
                  {viewItem.description}
                </p>
              )}

              <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["📍 Location", viewItem.location],
                  ["🗓 Date", viewItem.date],
                  ["📞 Contact", viewItem.contactNumber],
                ].map(([k, v]) =>
                  v ? (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#9CA3AF" }}>{k}</span>
                      <span style={{ fontWeight: 600, color: "#374151" }}>{v}</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>

            <div style={S.modalFooter}>
              <button
                style={S.btn("danger")}
                onClick={() => { setDeleteTarget(viewItem); setViewItem(null); }}
              >
                🗑 Delete
              </button>
              <button style={S.btn("secondary")} onClick={() => setViewItem(null)}>
                Close
              </button>
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