import { useState, useEffect, useRef } from "react";
import { db, storage } from "../../firebase/firebase";
import { collection, addDoc, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot, serverTimestamp,} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL,  deleteObject } from "firebase/storage";
import { color } from "framer-motion";
import { logAudit } from "../../utils/auditTrail";
import useDropdownOptions from "../../hooks/useDropdownOptions";
import { DEFAULT_LOST_FOUND_CATEGORIES } from "../../constants/dropdownDefaults";

// AUDIT TRAIL: reads the currently logged-in user (saved by Login.jsx) so
// every audit log entry records who actually performed the action.
// isSDO: when the page is opened from the Student Disciplinary Officer
// dashboard, force the audit "role" to "Student Disciplinary Officer"
// instead of whatever generic role is stored in localStorage.
const getCurrentUser = (isSDO) => {
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
      role: isSDO
        ? "Student Disciplinary Officer"
        : (localStorage.getItem("role") || stored.role || ""),
      department: stored.position || "",
      photoURL: stored.photoURL || "",
    };
  } catch {
    return {
      uid: localStorage.getItem("uid") || "",
      name: "Administrator",
      email: "",
      role: isSDO
        ? "Student Disciplinary Officer"
        : (localStorage.getItem("role") || ""),
      department: "",
      photoURL: "",
    };
  }
};


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
  reportType: "Lost", reporterName: "", itemName: "", category: "", description: "",
  location: "", date: "", status: "Pending", contactNumber: "", imageFile: null, categoryOther: "",
};

// Reporter name: letters, spaces, period, hyphen, apostrophe (e.g. "Juan Dela Cruz Jr.", "Ma. Cristina", "O'Brien")
const NAME_STRIP_REGEX = /[^A-Za-zñÑ\s.'-]/g;
const NAME_VALID_REGEX = /^[A-Za-zñÑ\s.'-]+$/;

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
export default function LostFoundPage({ darkMode, isSDO }) {
  const { options: categoryOptions } = useDropdownOptions(
    "lostFoundCategories",
    DEFAULT_LOST_FOUND_CATEGORIES
  );
  // "Others" is always last: it opens the "Specify category" input
  const CATEGORIES = [...categoryOptions.filter((c) => c !== "Others"), "Others"];
  
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

  // Full-screen image preview (lightbox) + change-photo in View modal
  const [previewImage, setPreviewImage] = useState(null);
  const [imageUpdating, setImageUpdating] = useState(false);
  const changeImageRef = useRef(null);

  // Save button state for the View modal (prevents spam-clicking)
  const [savingEdits, setSavingEdits] = useState(false);


const [editing, setEditing] = useState({
  reportType: false,
  status: false,
  name: false,
  description: false,
  category: false,
  location: false,
  date: false,
  contact: false,
  reporterName: false,
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
  reporterName: "",
});

// Only re-sync the edit fields when a DIFFERENT report is opened
// (so changing the photo does not wipe unsaved edits).
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
      reporterName: viewItem.reporterName || "",
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
      reporterName: false,
    });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [viewItem?.id]);


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

  // ── View modal: which fields were actually changed? ───────────────────────
  // Compares the edit fields against the saved report. Only fields that
  // really differ are returned (Firestore field names as keys).
  const getChanges = () => {
    if (!viewItem) return {};

    const finalCategory =
      editValue.category === "Others"
        ? editValue.categoryOther.trim()
        : editValue.category;

    const changes = {};

    if (editValue.reportType !== (viewItem.reportType || "Lost"))
      changes.reportType = editValue.reportType;

    if (editValue.status !== (viewItem.status || "Pending"))
      changes.status = editValue.status;

    if (editValue.name !== (viewItem.itemName || ""))
      changes.itemName = editValue.name;

    if (editValue.description !== (viewItem.description || ""))
      changes.description = editValue.description;

    // empty category (e.g. "Others" with no text yet) is not a valid change
    if (finalCategory && finalCategory !== (viewItem.category || ""))
      changes.category = finalCategory;

    if (editValue.location !== (viewItem.location || ""))
      changes.location = editValue.location;

    if (editValue.date !== (viewItem.date || ""))
      changes.date = editValue.date;

    if (editValue.contact !== (viewItem.contactNumber || ""))
      changes.contactNumber = editValue.contact;

    // empty reporter name is not saved
    const trimmedReporter = editValue.reporterName.trim();
    if (trimmedReporter && trimmedReporter !== (viewItem.reporterName || ""))
      changes.reporterName = trimmedReporter;

    return changes;
  };

  const pendingChanges = getChanges();
  const hasChanges = Object.keys(pendingChanges).length > 0;

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

// Replace the photo of an existing report (View modal).
// 1) upload the new image  2) update Firestore  3) delete the OLD image from Storage
const handleChangeImage = async (e) => {
  const input = e.target;
  const file = input.files[0];
  if (!file || !viewItem) return;

  const MAX_SIZE = 3 * 1024 * 1024; // 3MB

  if (file.size > MAX_SIZE) {
    alert("Image size must not exceed 3MB.");
    input.value = "";
    return;
  }

  setImageUpdating(true);

  const oldPath = viewItem.imagePath || null;
  const oldUrl = viewItem.imageUrl || null;

  try {
    const newPath = `lost_found/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, newPath);

    await uploadBytes(storageRef, file);
    const newUrl = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "lost_found", viewItem.id), {
      imageUrl: newUrl,
      imagePath: newPath,
    });

    // Delete the previous image from Firebase Storage
    if (oldPath) {
      try {
        await deleteObject(ref(storage, oldPath));
      } catch (storageErr) {
        console.error("Old image delete error:", storageErr);
      }
    }

    await logAudit({
      action: "Edited Lost & Found Item",
      module: "Lost & Found",
      documentId: viewItem.id,
      documentTitle: viewItem.itemName || "",
      performedBy: getCurrentUser(isSDO),
      oldData: { imageUrl: oldUrl },
      newData: { imageUrl: newUrl },
      description: oldUrl
        ? `Photo of "${viewItem.itemName}" was replaced.`
        : `Photo was added to "${viewItem.itemName}".`,
    });

    setViewItem((prev) => ({
      ...prev,
      imageUrl: newUrl,
      imagePath: newPath,
    }));
  } catch (err) {
    console.error("Error changing image:", err);
    alert("Failed to update photo. Please try again.");
  } finally {
    setImageUpdating(false);
    input.value = "";
  }
};

// Save ALL edited fields of the View modal at once (only when something changed).
const handleSaveChanges = async () => {
  if (!viewItem || savingEdits) return;

  const changes = getChanges();
  const changedKeys = Object.keys(changes);
  if (changedKeys.length === 0) return;

  setSavingEdits(true);

  try {
    await updateDoc(doc(db, "lost_found", viewItem.id), changes);

    const itemTitle = viewItem.itemName || "";

    const describe = {
      reportType: () => `Report type of "${itemTitle}" changed to ${changes.reportType}.`,
      status: () => `Status of "${itemTitle}" changed to ${changes.status}.`,
      category: () => `Category of "${itemTitle}" changed to ${changes.category}.`,
      itemName: () => `Item name changed from "${viewItem.itemName}" to "${changes.itemName}".`,
      description: () => `Description of "${itemTitle}" was updated.`,
      reporterName: () => `Reporter name of "${itemTitle}" was updated.`,
      location: () => `Location of "${itemTitle}" was updated.`,
      date: () => `Date of "${itemTitle}" was updated.`,
      contactNumber: () => `Contact number of "${itemTitle}" was updated.`,
    };

    for (const key of changedKeys) {
      await logAudit({
        action: "Edited Lost & Found Item",
        module: "Lost & Found",
        documentId: viewItem.id,
        documentTitle: changes.itemName || itemTitle,
        performedBy: getCurrentUser(isSDO),
        oldData: { [key]: viewItem[key] ?? "" },
        newData: { [key]: changes[key] },
        description: describe[key](),
      });
    }

    setViewItem((prev) => ({ ...prev, ...changes }));

    setEditing({
      reportType: false,
      status: false,
      name: false,
      description: false,
      category: false,
      location: false,
      date: false,
      contact: false,
      reporterName: false,
    });
  } catch (err) {
    console.error("Error saving changes:", err);
    alert("Failed to save changes. Please try again.");
  } finally {
    setSavingEdits(false);
  }
};

const validate = () => {
  const errs = {};

  // Required fields
  if (!form.reporterName.trim())
    errs.reporterName = "Reporter name is required.";

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

  // Reporter Name: letters, spaces, . ' - only
  if (
    form.reporterName.trim() &&
    !NAME_VALID_REGEX.test(form.reporterName.trim())
  ) {
    errs.reporterName =
      "Reporter name must contain letters only.";
  }

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
          reporterName: form.reporterName.trim(),
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
        performedBy: getCurrentUser(isSDO),
        newData: {
          reportType: form.reportType,
          reporterName: form.reporterName.trim(),
          itemName: form.itemName.trim(),
          category: finalCategory,
          description: form.description.trim(),
          location: form.location.trim(),
          date: form.date,
          status: form.status,
          contactNumber: form.contactNumber.trim(),
        },
        description: `${form.reportType} item "${form.itemName.trim()}" was reported by ${form.reporterName.trim()}.`,
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
          performedBy: getCurrentUser(isSDO),
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
  className={`min-h-screen md:h-screen md:overflow-hidden w-full px-4 md:px-6 lg:px-8 flex flex-col ${
    darkMode ? "bg-gray-950 text-white" : "bg-gray-50"
  }`}
>

    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 mt-4 md:mt-6 lg:mt-8">
    <div className="flex flex-col gap-2.5">
  <div className="flex items-center gap-2.5 flex-wrap">
    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
      Lost &amp; Found Management
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
        ＋ Add New Report
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

      {/* Type pills — wrapped in one row so they don't stack vertically on mobile */}
      <div className="flex flex-wrap items-center gap-2">
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
    </div>

   {/* Cards */}
{/* Mobile: the whole page scrolls (cards always visible). Desktop: only this area scrolls. */}
<div className="md:flex-1 md:min-h-0 md:overflow-y-auto">
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

                    {item.reporterName && (
                      <p
                        className={`text-xs flex items-center gap-1 mt-1 truncate ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        👤 {item.reporterName}
                      </p>
                    )}

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

              {/* Reported By */}
              <div style={S.field}>
                <label style={S.label}>Reported By *</label>
                <input
                    name="reporterName"
                    placeholder="Full name of the person reporting"
                    value={form.reporterName}
                    maxLength={50}
                    onChange={(e) => {
                      const value = e.target.value.replace(NAME_STRIP_REGEX, "");

                      setForm((prev) => ({
                        ...prev,
                        reporterName: value,
                      }));
                    }}
                      style={{
                        ...S.input,
                        background: darkMode ? "#1F2937" : "#FFFFFF",
                        color: darkMode ? "#F9FAFB" : "#111827",
                        borderColor: darkMode ? "#4B5563" : "#E5E7EB",
                      }}
                  />
                {errors.reporterName && <p style={S.errorText}>{errors.reporterName}</p>}
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
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
                  <label style={S.label}>Date *</label>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
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
                  {errors.contactNumber && (
                    <p style={S.errorText}>{errors.contactNumber}</p>
                  )}
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

            {/* IMAGE (click to preview, button to change photo) */}
            <div style={{ position: "relative" }}>
              {viewItem.imageUrl ? (
                <img
                  src={viewItem.imageUrl}
                  alt={viewItem.itemName}
                  onClick={() => setPreviewImage(viewItem.imageUrl)}
                  title="Click to preview"
                  style={{
                    width: "100%",
                    maxHeight: 220,
                    objectFit: "cover",
                    display: "block",
                    cursor: "zoom-in",
                    opacity: imageUpdating ? 0.4 : 1,
                    transition: "opacity .15s",
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

              {imageUpdating && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,.35)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Updating photo…
                </div>
              )}

              <button
                type="button"
                disabled={imageUpdating}
                onClick={() => changeImageRef.current?.click()}
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: imageUpdating ? "not-allowed" : "pointer",
                  background: "rgba(17,24,39,.8)",
                  color: "#fff",
                  opacity: imageUpdating ? 0.6 : 1,
                }}
              >
                📷 {viewItem.imageUrl ? "Change Photo" : "Add Photo"}
              </button>

              <input
                type="file"
                accept="image/*"
                ref={changeImageRef}
                onChange={handleChangeImage}
                style={{ display: "none" }}
              />
            </div>

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
                {/* REPORT TYPE (EDITABLE — saved with the Save Changes button) */}
                {editing.reportType ? (
                  <select
                    autoFocus
                    value={editValue.reportType}
                    onChange={(e) => {
                      const value = e.target.value;

                      setEditValue((prev) => ({
                        ...prev,
                        reportType: value,
                      }));
                    }}
                    onBlur={() =>
                      setEditing((prev) => ({
                        ...prev,
                        reportType: false,
                      }))
                    }
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
                      label={editValue.reportType}
                      config={TYPE_CONFIG[editValue.reportType] || TYPE_CONFIG.Lost}
                    />
                  </span>
                )}

                {/* STATUS (EDITABLE — saved with the Save Changes button) */}
                {editing.status ? (
                  <select
                    autoFocus
                    value={editValue.status}
                    onChange={(e) => {
                      const value = e.target.value;

                      setEditValue((prev) => ({
                        ...prev,
                        status: value,
                      }));
                    }}
                    onBlur={() =>
                      setEditing((prev) => ({
                        ...prev,
                        status: false,
                      }))
                    }
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
                    onClick={() =>
                      setEditing((prev) => ({ ...prev, status: true }))
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <Badge
                      label={editValue.status}
                      config={
                        STATUS_CONFIG[editValue.status] ||
                        STATUS_CONFIG.Pending
                      }
                    />
                  </span>
                )}

            {/* CATEGORY (EDITABLE — saved with the Save Changes button) */}
              {editing.category ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <select
                    autoFocus
                    value={editValue.category}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === "Others") {
                        // wait for the custom text
                        setEditValue((prev) => ({ ...prev, category: value }));
                        return;
                      }

                      setEditValue((prev) => ({ ...prev, category: value, categoryOther: "" }));
                    }}
                    onBlur={() => {
                      // keep the editor open while the "Specify category" input is needed
                      if (editValue.category === "Others") return;
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
                      onBlur={() =>
                        setEditing((prev) => ({ ...prev, category: false }))
                      }
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
                  {editValue.category === "Others"
                    ? (editValue.categoryOther.trim() || "Others")
                    : editValue.category}
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
                    onBlur={() =>
                      setEditing((prev) => ({
                        ...prev,
                        name: false,
                      }))
                    }
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
                    {editValue.name}
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
                    onBlur={() =>
                      setEditing((prev) => ({
                        ...prev,
                        description: false,
                      }))
                    }
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
                    {editValue.description || "No description"}
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

        {/* Reported By */}
        <div>
          <span style={{ color: darkMode ? "#ffffff" : "#000000", fontSize: 14 }}>
            👤 {editValue.reportType === "Found" ? "Found / Returned By" : "Reported By"}
          </span>

          {editing.reporterName ? (
            <input
              value={editValue.reporterName}
              maxLength={50}
              onChange={(e) =>
                setEditValue((p) => ({
                  ...p,
                  reporterName: e.target.value.replace(NAME_STRIP_REGEX, ""),
                }))
              }
              onBlur={() => {
                // empty: go back to the saved name
                if (!editValue.reporterName.trim()) {
                  setEditValue((p) => ({
                    ...p,
                    reporterName: viewItem.reporterName || "",
                  }));
                }
                setEditing((p) => ({ ...p, reporterName: false }));
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
                  reporterName: true,
                }))
              }
              style={{
                color: darkMode ? "#E5E7EB" : "#111827",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {editValue.reporterName || "—"}
            </div>
          )}
        </div>

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
              onBlur={() =>
                setEditing((p) => ({
                  ...p,
                  location: false,
                }))
              }
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
              {editValue.location}
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
              onBlur={() =>
                setEditing((p) => ({
                  ...p,
                  date: false,
                }))
              }
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
              {editValue.date}
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
              onBlur={() =>
                setEditing((p) => ({
                  ...p,
                  contact: false,
                }))
              }
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
              {editValue.contact}
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
                        alignItems: "center",
                        gap: 8,
                    borderTop:`1px solid ${
                      darkMode ? "#374151" : "#E5E7EB"
                    }`,
                  }}
                >

              {hasChanges && !savingEdits && (
                <span
                  style={{
                    marginRight: "auto",
                    fontSize: 12,
                    fontWeight: 600,
                    color: darkMode ? "#FBBF24" : "#B45309",
                  }}
                >
                  Unsaved changes
                </span>
              )}

              {/* RIGHT: ACTIONS */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  // keeps the open input from blurring (and shifting the layout) before the click registers
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || savingEdits}
                  style={{
                    ...S.btn("primary"),
                    opacity: !hasChanges || savingEdits ? 0.5 : 1,
                    cursor: !hasChanges || savingEdits ? "not-allowed" : "pointer",
                  }}
                >
                  {savingEdits ? "Saving…" : "💾 Save Changes"}
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

            {/* ── Image Preview (Lightbox) ─────────────────────────────────────────── */}
            {previewImage && (
              <div
                style={{
                  ...S.overlay,
                  zIndex: 70,
                  background: "rgba(0,0,0,.9)",
                  cursor: "zoom-out",
                }}
                onClick={() => setPreviewImage(null)}
              >
                <button
                  style={{
                    ...S.closeBtn,
                    position: "absolute",
                    top: 16,
                    right: 20,
                    fontSize: 28,
                    color: "#fff",
                  }}
                  onClick={() => setPreviewImage(null)}
                >
                  ✕
                </button>
                <img
                  src={previewImage}
                  alt="Preview"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: 8,
                    cursor: "default",
                  }}
                />
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