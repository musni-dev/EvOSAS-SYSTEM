import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { FaEye, FaTrash } from "react-icons/fa";
import { logAudit } from "../../utils/auditTrail";
import useDropdownOptions from "../../hooks/useDropdownOptions";
import { DEFAULT_PROGRAMS } from "../../constants/dropdownDefaults";

const getCurrentUser = (isSDO) => {
  try {
    const stored = JSON.parse(localStorage.getItem("userData") || "{}");
    const name =
      [stored.firstName, stored.lastName].filter(Boolean).join(" ") ||
      stored.username ||
      (isSDO ? "Student Disciplinary Officer" : "Administrator");

    return {
      uid: localStorage.getItem("uid") || stored.uid || "",
      name,
      email: stored.username || "",
      role: isSDO
        ? "Student Disciplinary Officer"
        : localStorage.getItem("role") || stored.role || "Administrator",
      department: stored.position || "",
      photoURL: stored.photoURL || "",
    };
  } catch {
    return {
      uid: localStorage.getItem("uid") || "",
      name: isSDO ? "Student Disciplinary Officer" : "Administrator",
      email: "",
      role: isSDO ? "Student Disciplinary Officer" : localStorage.getItem("role") || "Administrator",
      department: "",
      photoURL: "",
    };
  }
};

const emptyStudent = {
  studentId: "",
  name: "",
  lastName: "",
  firstName: "",
  middleName: "",
  suffix: "",
  program: "",
  yearLevel: "",
  section: "",
  incidentDate: "",
  location: "",
  contactNumber: "",
  status: "In Progress",
  incidentType: "",
  otherIncident: "",
  offense: "",
  sanctions: "",
  decision: "",
};

// ---- NAME HELPERS ----
// The full `name` string ("Lastname, Firstname Middlename Suffix") is still
// saved in Firestore so search, autofill, audit trail and old records keep
// working exactly the same. The separate parts are saved on top of it.
const composeName = ({ lastName = "", firstName = "", middleName = "", suffix = "" }) => {
  const rest = [firstName.trim(), middleName.trim(), suffix.trim()].filter(Boolean).join(" ");
  return [lastName.trim(), rest].filter(Boolean).join(", ");
};

// For OLD records that only have a single `name` string.
const parseName = (fullName = "") => {
  const [last, ...rest] = fullName.split(",");
  return {
    lastName: (last || "").trim(),
    firstName: rest.join(",").trim(),
    middleName: "",
    suffix: "",
  };
};

const getNameParts = (c) =>
  c.lastName || c.firstName ? {
    lastName: c.lastName || "",
    firstName: c.firstName || "",
    middleName: c.middleName || "",
    suffix: c.suffix || "",
  } : parseName(c.name);

// letters, spaces and periods only (no digits / special characters)
const cleanNamePart = (value) => value.replace(/[^A-Za-z\s.]/g, "");

// SECTION: only ONE letter allowed (A-Z), automatically uppercase
const cleanSection = (value) => value.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase();

// "in-progress" (new cases) and "In Progress" (edited cases) are the same status
const normalizeStatus = (s) => (s || "").toLowerCase().replace(/[\s_-]+/g, "-");
const isClosedStatus = (s) => normalizeStatus(s) === "closed";

const ITEMS_PER_PAGE = 5;

// ---- Reusable style helpers (dark-mode aware) ----
function fieldClass(darkMode, editable = true) {
  if (!editable) {
    return darkMode
      ? "w-full mt-1 border border-gray-700 rounded-xl p-3 bg-gray-800/60 text-gray-400"
      : "w-full mt-1 border rounded-xl p-3 bg-gray-100 text-gray-500";
  }
  return darkMode
    ? "w-full mt-1 border border-gray-700 rounded-xl p-3 bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 outline-none"
    : "w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none";
}

function labelClass(darkMode) {
  return `text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`;
}

function filterSelectClass(darkMode) {
  return `rounded-xl px-4 py-2 border outline-none focus:ring-2 ${
    darkMode
      ? "bg-gray-800 border-gray-700 text-white focus:ring-pink-500"
      : "border-gray-300 bg-white text-gray-700 focus:ring-[#ff6699]"
  }`;
}

export default function CaseRecords({ cases: casesProp, setActivePage, isSDO, darkMode }) {
  const { options: programs } = useDropdownOptions("programs", DEFAULT_PROGRAMS);
  const [showModal, setShowModal] = useState(false);
  const [localCases, setLocalCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // FILTERS + PAGINATION
  const [offenseFilter, setOffenseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedCase, setSelectedCase] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Prevents duplicate submissions if the user clicks "Save Case" more than
  // once (e.g. double-click, slow network) while the add-case request is
  // still in flight.
  const [isSaving, setIsSaving] = useState(false);

  // ANTI-SPAM: same idea for "Save Changes" (edit modal) and delete.
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use the parent-supplied realtime `cases` prop when available (e.g. from
  // sdoHomepage.jsx's onSnapshot listener); otherwise fetch once ourselves
  // so this component still works standalone.
  const usingOwnCases = casesProp === undefined;
  const cases = usingOwnCases ? localCases : casesProp;

  const handleView = (item) => {
    // Fill in the separate name parts (also for old records that only have `name`)
    setSelectedCase({ ...item, ...getNameParts(item) });
    setIsEditing(false);
    setShowViewModal(true);
  };

  const handleDelete = async (id) => {
    if (isDeleting) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this case?");
    if (!confirmDelete) return;

    // AUDIT TRAIL: capture the case data before it's removed from Firestore
    const caseToDelete = cases.find((c) => c.id === id);

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "cases", id));

      await logAudit({
        action: "Deleted Case",
        module: "Cases",
        documentId: id,
        documentTitle: caseToDelete?.caseNumber || "",
        performedBy: getCurrentUser(isSDO),
        oldData: caseToDelete || null,
        description: `Disciplinary case ${caseToDelete?.caseNumber || id} was deleted.`,
      });

      if (usingOwnCases) {
        setLocalCases((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete case.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async () => {
    // Guard against double-submit: ignore extra clicks while an update is
    // already in progress.
    if (isUpdating) return;

    if (!selectedCase.lastName?.trim() || !selectedCase.firstName?.trim()) {
      alert("Last Name and First Name are required.");
      return;
    }

    setIsUpdating(true);
    try {
      const caseRef = doc(db, "cases", selectedCase.id);

      // AUDIT TRAIL: the original (pre-edit) case is still intact in the
      // `cases` list state, since selectedCase edits work on a separate copy.
      const oldCaseData = cases.find((c) => c.id === selectedCase.id) || null;

      const updatedFields = {
        studentId: selectedCase.studentId,
        name: composeName(selectedCase),
        lastName: selectedCase.lastName.trim(),
        firstName: selectedCase.firstName.trim(),
        middleName: (selectedCase.middleName || "").trim(),
        suffix: (selectedCase.suffix || "").trim(),
        program: selectedCase.program,
        yearLevel: selectedCase.yearLevel,
        section: selectedCase.section,
        incidentDate: selectedCase.incidentDate,
        location: selectedCase.location,
        contactNumber: selectedCase.contactNumber,
        incidentType: selectedCase.incidentType,
        offense: selectedCase.offense,
        sanctions: selectedCase.sanctions,
        decision: selectedCase.decision,
        status: selectedCase.status,
      };

      await updateDoc(caseRef, updatedFields);

      await logAudit({
        action: "Edited Case",
        module: "Cases",
        documentId: selectedCase.id,
        documentTitle: selectedCase.caseNumber || "",
        performedBy: getCurrentUser(isSDO),
        oldData: oldCaseData,
        newData: { ...selectedCase, ...updatedFields },
        description: `Disciplinary case ${selectedCase.caseNumber} was updated.`,
      });

      if (usingOwnCases) {
        setLocalCases((prev) =>
          prev.map((c) => (c.id === selectedCase.id ? { ...c, ...updatedFields } : c))
        );
      }

      setIsEditing(false);
      setShowViewModal(false);
    } catch (error) {
      console.error("Update Error:", error);
      alert(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const getOffenseLevel = (item) => {
    // Student ID is the single source of truth for offense counting — a
    // student's name can be re-typed slightly differently across cases,
    // but their Student ID never changes.
    const userCases = cases
      .filter((c) => c.studentId === item.studentId)
      .sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);

    const index = userCases.findIndex((c) => c.id === item.id);

    if (index === 0) return "WARNING";
    if (index === 1) return "1ST OFFENSE";
    if (index === 2) return "2ND OFFENSE";
    return "3RD OFFENSE";
  };

  const [student, setStudent] = useState(emptyStudent);

  const handleCloseModal = () => {
    if (isSaving) return;
    setStudent(emptyStudent);
    setShowModal(false);
  };

  // CASE NUMBER
  const [caseNumber, setCaseNumber] = useState("");

  useEffect(() => {
    if (cases) {
      const getNextCaseNumber = (list) => {
        if (!list || list.length === 0) return "CASE-0000001";

        const maxNumber = Math.max(
          ...list.map((c) => {
            const num = c.caseNumber?.replace("CASE-", "");
            return parseInt(num || "0", 10);
          })
        );

        return `CASE-${String(maxNumber + 1).padStart(7, "0")}`;
      };

      setCaseNumber(getNextCaseNumber(cases));
    }
  }, [cases]);

  const handleChange = (e) => {
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  // Name parts (Last / First / Middle / Suffix) in the Add Case form
  const handleNamePartChange = (e) => {
    const value = cleanNamePart(e.target.value);
    setStudent((prev) => {
      const updated = { ...prev, [e.target.name]: value };
      updated.name = composeName(updated);
      return updated;
    });
  };

  const handleSave = async () => {
    // Guard against double-submit: ignore extra clicks while a save is
    // already in progress.
    if (isSaving) return;

    // Required fields
    if (
      !student.studentId.trim() ||
      !student.lastName.trim() ||
      !student.firstName.trim() ||
      !student.middleName.trim() ||
      !student.program ||
      !student.yearLevel ||
      !student.section.trim() ||
      !student.incidentDate ||
      !student.location.trim() ||
      !student.incidentType ||
      !student.offense.trim() ||
      !student.sanctions.trim() ||
      !student.decision.trim()
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!/^\d{9}$/.test(student.studentId)) {
      alert("Student ID must be exactly 9 digits.");
      return;
    }

    if (
      !/^[A-Za-z\s.]+$/.test(student.lastName) ||
      !/^[A-Za-z\s.]+$/.test(student.firstName) ||
      !/^[A-Za-z\s.]+$/.test(student.middleName) ||
      (student.suffix && !/^[A-Za-z\s.]+$/.test(student.suffix))
    ) {
      alert("Name fields can only contain letters, spaces, and periods.");
      return;
    }

    if (student.incidentType === "Other" && !student.otherIncident.trim()) {
      alert("Please specify the incident type.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (student.incidentDate > today) {
      alert("Date of Incident cannot be a future date.");
      return;
    }

    if (student.contactNumber && !/^09\d{9}$/.test(student.contactNumber)) {
      alert("Contact Number must be a valid 11-digit mobile number.");
      return;
    }

    setIsSaving(true);
    try {
      const newCase = {
        ...student,
        // full name string kept for search / autofill / audit trail
        name: composeName(student),
        caseNumber,
        status: "in-progress",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "cases"), newCase);

      await logAudit({
        action: "Added Case",
        module: "Cases",
        documentId: docRef.id,
        documentTitle: caseNumber,
        performedBy: getCurrentUser(isSDO),
        newData: newCase,
        description: `New disciplinary case ${caseNumber} was added.`,
      });

      if (usingOwnCases) {
        setLocalCases((prev) => [...prev, { ...newCase, id: docRef.id }]);
      }

      setStudent(emptyStudent);
      setShowModal(false);
    } catch (error) {
      console.error("SAVE ERROR:", error);
      alert("Failed to save case. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!usingOwnCases) return;

    const fetchCases = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "cases"));
        const data = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLocalCases(data);
      } catch (error) {
        console.error("FETCH ERROR:", error);
      }
    };

    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Go back to page 1 whenever the search / filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, offenseFilter, statusFilter]);

  const filteredCases = cases.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.name?.toLowerCase().includes(term) ||
      item.studentId?.toLowerCase().includes(term);

    const matchesOffense = offenseFilter === "All" || getOffenseLevel(item) === offenseFilter;

    const matchesStatus =
      statusFilter === "All" || normalizeStatus(item.status) === normalizeStatus(statusFilter);

    return matchesSearch && matchesOffense && matchesStatus;
  });

  // PAGINATION (5 cases per page, newest first like before)
  const orderedCases = [...filteredCases].reverse();
  const totalPages = Math.max(1, Math.ceil(orderedCases.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedCases = orderedCases.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Show at most 5 page numbers around the current page so the bar never overflows
  const pageWindowStart = Math.max(1, Math.min(safePage - 2, totalPages - 4));
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + 4);
  const visiblePages = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, i) => pageWindowStart + i
  );

  const pageBtnClass = (active, disabled) =>
    `px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
      active
        ? "bg-[#ff6699] text-white shadow-md"
        : darkMode
        ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
        : "bg-gray-100 text-gray-700 hover:bg-pink-50"
    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`;

  return (
    <div className={`min-h-full w-full flex flex-col space-y-4 sm:space-y-6 p-3 sm:p-6 ${darkMode ? "bg-gray-950" : "bg-pink-50/60"}`}>
      {/* HEADER */}
      <div
        className={`backdrop-blur-xl rounded-3xl p-5 sm:p-8 shadow-md border ${
          darkMode ? "bg-gray-900 border-gray-700" : "bg-white/70 border-white"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* LEFT */}
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
              Disciplinary Case Management
            </h1>

            <p className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Manage disciplinary records, sanctions, and case resolutions.
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex flex-wrap justify-start lg:justify-end gap-3">
            <button
              onClick={() => setShowModal(true)}
              disabled={showModal}
              className={`bg-pink-500 hover:bg-pink-600 transition text-white px-5 py-3 rounded-xl shadow-md font-semibold ${
                showModal ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              + Add New Case
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div
        className={`rounded-3xl shadow-md p-4 sm:p-6 ${
          darkMode ? "bg-gray-900 border border-gray-700" : "bg-white"
        }`}
      >
        <div>
          {/* HEADER + SEARCH + FILTERS */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-700"}`}>Case Records</h2>

              <input
                type="text"
                placeholder="Search by Last Name or Student ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full sm:w-96 rounded-xl px-4 py-2 border ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-pink-500"
                    : "border-gray-300 focus:ring-[#ff6699]"
                }`}
              />
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className={`text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Offense Level
                </label>
                <select
                  value={offenseFilter}
                  onChange={(e) => setOffenseFilter(e.target.value)}
                  className={filterSelectClass(darkMode)}
                >
                  <option value="All">All</option>
                  <option value="WARNING">Warning</option>
                  <option value="1ST OFFENSE">1st Offense</option>
                  <option value="2ND OFFENSE">2nd Offense</option>
                  <option value="3RD OFFENSE">3rd Offense</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className={`text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={filterSelectClass(darkMode)}
                >
                  <option value="All">All</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {(offenseFilter !== "All" || statusFilter !== "All") && (
                <button
                  onClick={() => {
                    setOffenseFilter("All");
                    setStatusFilter("All");
                  }}
                  className={`text-sm font-medium underline ${
                    darkMode ? "text-pink-400 hover:text-pink-300" : "text-pink-600 hover:text-pink-700"
                  }`}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Only the table scrolls sideways on small screens — filters and pagination stay visible */}
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left border-collapse">
            <thead>
              <tr className={darkMode ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"}>
                <th className="p-4 rounded-l-xl">Case Number</th>
                <th className="p-4">Student ID</th>
                <th className="p-4">Year & Section</th>
                <th className="p-4">Incident Type</th>
                <th className="p-4">Status</th>
                <th className="p-4 rounded-r-xl">Offense Level</th>
              </tr>
            </thead>

            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan="6" className={`text-center p-6 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                    No disciplinary records yet.
                  </td>
                </tr>
              ) : paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan="6" className={`text-center p-6 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                    No cases match your search or filters.
                  </td>
                </tr>
              ) : (
                paginatedCases.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleView(item)}
                    className={`border-b transition cursor-pointer ${
                      darkMode ? "border-gray-700 hover:bg-gray-800" : "hover:bg-pink-50"
                    }`}
                  >
                    <td className="p-4 font-semibold text-pink-500">{item.caseNumber}</td>
                    <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>{item.studentId}</td>
                    <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                      {item.yearLevel} - {item.section}
                    </td>
                    <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                      {item.incidentType === "Other" ? item.otherIncident : item.incidentType}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isClosedStatus(item.status)
                            ? darkMode
                              ? "bg-green-900 text-green-300"
                              : "bg-green-100 text-green-700"
                            : darkMode
                            ? "bg-yellow-900 text-yellow-300"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          getOffenseLevel(item) === "WARNING"
                            ? darkMode
                              ? "bg-gray-700 text-gray-200"
                              : "bg-gray-200 text-gray-700"
                            : getOffenseLevel(item) === "1ST OFFENSE"
                            ? darkMode
                              ? "bg-yellow-900 text-yellow-300"
                              : "bg-yellow-100 text-yellow-700"
                            : getOffenseLevel(item) === "2ND OFFENSE"
                            ? darkMode
                              ? "bg-orange-900 text-orange-300"
                              : "bg-orange-100 text-orange-700"
                            : darkMode
                            ? "bg-red-900 text-red-300"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {getOffenseLevel(item)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>

          {/* PAGINATION */}
          {orderedCases.length > 0 && (
            <div className="flex flex-col items-center sm:flex-row sm:justify-between gap-3 mt-5">
              <p className={`text-sm text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, orderedCases.length)} of{" "}
                {orderedCases.length} case{orderedCases.length > 1 ? "s" : ""}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(safePage - 1)}
                  disabled={safePage === 1}
                  className={pageBtnClass(false, safePage === 1)}
                >
                  Previous
                </button>

                {visiblePages.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    disabled={page === safePage}
                    className={pageBtnClass(page === safePage, false)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className={pageBtnClass(false, safePage === totalPages)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD CASE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div
            className={`rounded-3xl shadow-2xl w-full w-[95%] sm:max-w-4xl p-4 sm:p-8 overflow-y-auto max-h-[95vh] ${
              darkMode ? "bg-gray-900 border border-gray-700" : "bg-white"
            }`}
          >
            {/* HEADER */}
            <div className="flex justify-between items-center mb-1">
              <div>
                <h2 className="text-3xl font-bold text-[#ff6699]">Add Disciplinary Case</h2>
                <p className={darkMode ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                  Create and manage disciplinary records.
                </p>
              </div>

              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className={`text-3xl transition ${
                  darkMode ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"
                } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                ✕
              </button>
            </div>

            {/* CASE DETAILS */}
            <div
              className={`rounded-2xl p-5 mb-1 border ${
                darkMode ? "bg-gray-800/60 border-gray-700" : "bg-pink-50 border-pink-100"
              }`}
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass(darkMode)}>Case Number</label>
                  <input type="text" value={caseNumber} disabled className={`${fieldClass(darkMode, false)} font-semibold text-[#ff6699]`} />
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Date Created</label>
                  <input type="text" value={new Date().toLocaleDateString()} disabled className={fieldClass(darkMode, false)} />
                </div>
              </div>
            </div>

            {/* STUDENT INFO */}
            <div className="mb-8 mt-6">
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
                Student Information Records
              </h3>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelClass(darkMode)}>Student ID *</label>
                  <input
                    type="text"
                    name="studentId"
                    maxLength={9}
                    required
                    value={student.studentId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");

                      setStudent((prev) => {
                        const updated = { ...prev, studentId: value };

                        // AUTOFILL: if this student ID already has a case on
                        // record, pull in their name & program automatically.
                        if (value.length === 9) {
                          const existing = cases.find((c) => c.studentId === value);

                          if (existing) {
                            const parts = getNameParts(existing);
                            updated.lastName = parts.lastName || prev.lastName;
                            updated.firstName = parts.firstName || prev.firstName;
                            updated.middleName = parts.middleName || prev.middleName;
                            updated.suffix = parts.suffix || prev.suffix;
                            updated.name = existing.name || composeName(updated);
                            updated.program = existing.program || prev.program;
                          }
                        }

                        return updated;
                      });
                    }}
                    placeholder="9-digit ID Number"
                    className={fieldClass(darkMode)}
                  />
                  {student.studentId.length > 0 && student.studentId.length < 9 && (
                    <p className="text-red-500 text-xs mt-1">Student ID must be 9 digits.</p>
                  )}
                  {student.studentId.length === 9 &&
                    cases.some((c) => c.studentId === student.studentId) && (
                      <p className="text-emerald-500 text-xs mt-1">
                        Existing student found — name & program auto-filled.
                      </p>
                    )}
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={student.lastName}
                    onChange={handleNamePartChange}
                    placeholder="Last Name"
                    className={fieldClass(darkMode)}
                  />
                </div>

                <div>
                  <label className={labelClass(darkMode)}>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={student.firstName}
                    onChange={handleNamePartChange}
                    placeholder="First Name"
                    className={fieldClass(darkMode)}
                  />
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Middle Name *</label>
                  <input
                    type="text"
                    name="middleName"
                    required
                    value={student.middleName}
                    onChange={handleNamePartChange}
                    placeholder="Middle Name"
                    className={fieldClass(darkMode)}
                  />
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Suffix (optional)</label>
                  <input
                    type="text"
                    name="suffix"
                    value={student.suffix}
                    onChange={handleNamePartChange}
                    placeholder="Ex: Jr., III"
                    className={fieldClass(darkMode)}
                  />
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Program *</label>
                  <select name="program" required value={student.program} onChange={handleChange} className={fieldClass(darkMode)}>
                    <option value="">Select Program</option>
                    {/* Keep an autofilled value visible even if it is no longer in the list */}
                    {student.program && !programs.includes(student.program) && (
                      <option value={student.program}>{student.program}</option>
                    )}
                    {programs.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Year Level *</label>
                  <select name="yearLevel" required value={student.yearLevel} onChange={handleChange} className={fieldClass(darkMode)}>
                    <option value="">Select Year Level</option>
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Section *</label>
                  <input
                    type="text"
                    name="section"
                    required
                    maxLength={1}
                    value={student.section}
                    onChange={(e) =>
                      setStudent((prev) => ({ ...prev, section: cleanSection(e.target.value) }))
                    }
                    placeholder="Ex: A"
                    className={fieldClass(darkMode)}
                  />
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Date of Incident *</label>
                  <input
                    type="date"
                    name="incidentDate"
                    required
                    max={new Date().toISOString().split("T")[0]}
                    value={student.incidentDate}
                    onChange={handleChange}
                    className={fieldClass(darkMode)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass(darkMode)}>Location of Incident *</label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={student.location}
                    onChange={handleChange}
                    placeholder="Where did the incident happen?"
                    className={fieldClass(darkMode)}
                  />
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Contact Number (optional)</label>
                  <input
                    type="text"
                    name="contactNumber"
                    value={student.contactNumber}
                    onChange={handleChange}
                    placeholder="09xxxxxxxxx"
                    className={fieldClass(darkMode)}
                  />
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Status *</label>
                  <select name="status" value={student.status} onChange={handleChange} className={fieldClass(darkMode)}>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TYPE OF INCIDENT */}
            <div className="mb-8">
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>Type of Incident *</h3>

              <div className="flex flex-wrap gap-3">
                {["Academic", "Behavioral", "Safety/Health", "Property Damage", "Other"].map((type) => (
                  <label
                    key={type}
                    className={`px-5 py-3 rounded-full border cursor-pointer transition font-medium ${
                      student.incidentType === type
                        ? "bg-[#ff6699] text-white border-[#ff6699]"
                        : darkMode
                        ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                        : "bg-gray-100 hover:bg-pink-50"
                    }`}
                  >
                    <input type="radio" name="incidentType" required value={type} className="hidden" onChange={handleChange} />
                    {type}
                  </label>
                ))}
              </div>

              {student.incidentType === "Other" && (
                <input
                  type="text"
                  name="otherIncident"
                  required
                  placeholder="Specify incident type..."
                  value={student.otherIncident}
                  onChange={handleChange}
                  className={`${fieldClass(darkMode)} mt-4`}
                />
              )}
            </div>

            {/* NARRATIVE */}
            <div className="mb-8">
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
                Incident Description Narrative *
              </h3>
              <textarea
                name="offense"
                required
                value={student.offense}
                onChange={handleChange}
                placeholder="Describe the incident in detail..."
                className={`${fieldClass(darkMode)} h-32 rounded-2xl`}
              />
            </div>

            {/* IMMEDIATE ACTION */}
            <div className="mb-8">
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
                Immediate Actions Taken *
              </h3>
              <textarea
                name="sanctions"
                required
                value={student.sanctions}
                onChange={handleChange}
                placeholder="Enter actions immediately taken..."
                className={`${fieldClass(darkMode)} h-28 rounded-2xl`}
              />
            </div>

            {/* FOLLOW UP */}
            <div className="mb-8">
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
                Follow-up Actions / Recommendations *
              </h3>
              <textarea
                name="decision"
                required
                value={student.decision}
                onChange={handleChange}
                placeholder="Enter recommendations or follow-up actions..."
                className={`${fieldClass(darkMode)} h-28 rounded-2xl`}
              />
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-4">
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className={`px-6 py-3 rounded-xl transition font-semibold ${
                  darkMode ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"
                } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Close
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-7 py-3 rounded-xl transition text-white font-semibold shadow-lg ${
                  isSaving
                    ? "bg-pink-300 cursor-not-allowed"
                    : "bg-[#ff6699] hover:bg-[#ff4f8b]"
                }`}
              >
                {isSaving ? "Saving..." : "Save Case"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW / EDIT MODAL */}
      {showViewModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto ${
              darkMode ? "bg-gray-900 border border-gray-700" : "bg-white"
            }`}
          >
            {/* HEADER */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#ff6699]">Case Details</h2>
                <p className={darkMode ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                  View disciplinary record information.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-xl"
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isUpdating}
                      className={`px-4 py-2 rounded-xl ${darkMode ? "bg-gray-800 text-gray-200" : "bg-gray-300"} ${
                        isUpdating ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Cancel Edit
                    </button>

                    <button
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      className={`text-white px-4 py-2 rounded-xl ${
                        isUpdating
                          ? "bg-green-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    if (isUpdating) return;
                    setShowViewModal(false);
                    setIsEditing(false);
                  }}
                  disabled={isUpdating}
                  className={`text-2xl ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-500"} ${
                    isUpdating ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* GRID INFO */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass(darkMode)}>Case Number</label>
                <input value={selectedCase.caseNumber} disabled className={fieldClass(darkMode, false)} />
              </div>

              <div>
                <label className={labelClass(darkMode)}>Date Created</label>
                <input
                  value={selectedCase.createdAt?.toDate ? selectedCase.createdAt.toDate().toLocaleDateString() : ""}
                  disabled
                  className={fieldClass(darkMode, false)}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass(darkMode)}>Student ID</label>
                <input
                  type="text"
                  value={selectedCase.studentId}
                  disabled={!isEditing}
                  maxLength={9}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 9);
                    setSelectedCase({ ...selectedCase, studentId: value });
                  }}
                  className={fieldClass(darkMode, isEditing)}
                />
              </div>

              <div>
                <label className={labelClass(darkMode)}>Last Name</label>
                <input
                  value={selectedCase.lastName || ""}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setSelectedCase({ ...selectedCase, lastName: cleanNamePart(e.target.value) })
                  }
                  className={fieldClass(darkMode, isEditing)}
                />
              </div>

              <div>
                <label className={labelClass(darkMode)}>First Name</label>
                <input
                  value={selectedCase.firstName || ""}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setSelectedCase({ ...selectedCase, firstName: cleanNamePart(e.target.value) })
                  }
                  className={fieldClass(darkMode, isEditing)}
                />
              </div>

              <div>
                <label className={labelClass(darkMode)}>Middle Name</label>
                <input
                  value={selectedCase.middleName || ""}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setSelectedCase({ ...selectedCase, middleName: cleanNamePart(e.target.value) })
                  }
                  className={fieldClass(darkMode, isEditing)}
                />
              </div>

              <div>
                <label className={labelClass(darkMode)}>Suffix (optional)</label>
                <input
                  value={selectedCase.suffix || ""}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setSelectedCase({ ...selectedCase, suffix: cleanNamePart(e.target.value) })
                  }
                  className={fieldClass(darkMode, isEditing)}
                />
              </div>

              <div>
                <label className={labelClass(darkMode)}>Program</label>
                  <select
                    disabled={!isEditing}
                    value={selectedCase.program}
                    onChange={(e) => setSelectedCase({ ...selectedCase, program: e.target.value })}
                    className={fieldClass(darkMode, isEditing)}
                  >
                    {/* Keep the saved value visible even if it was renamed or removed from the list */}
                    {selectedCase.program && !programs.includes(selectedCase.program) && (
                      <option value={selectedCase.program}>{selectedCase.program}</option>
                    )}
                    {programs.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
              </div>

              <div>
                <label className={labelClass(darkMode)}>Year Level</label>
                <select
                  disabled={!isEditing}
                  value={selectedCase.yearLevel}
                  onChange={(e) => setSelectedCase({ ...selectedCase, yearLevel: e.target.value })}
                  className={fieldClass(darkMode, isEditing)}
                >
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
              </div>

              <div>
                <label className={labelClass(darkMode)}>Section</label>
                <input
                  value={selectedCase.section}
                  disabled={!isEditing}
                  maxLength={1}
                  onChange={(e) =>
                    setSelectedCase({ ...selectedCase, section: cleanSection(e.target.value) })
                  }
                  placeholder="Ex: A"
                  className={fieldClass(darkMode, isEditing)}
                />
              </div>

              <div>
                <label className={labelClass(darkMode)}>Incident Date</label>
                <input
                  type="date"
                  value={selectedCase.incidentDate}
                  disabled={!isEditing}
                  onChange={(e) => setSelectedCase({ ...selectedCase, incidentDate: e.target.value })}
                  className={fieldClass(darkMode, isEditing)}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass(darkMode)}>Location</label>
                <input
                  value={selectedCase.location}
                  disabled={!isEditing}
                  onChange={(e) => setSelectedCase({ ...selectedCase, location: e.target.value })}
                  className={fieldClass(darkMode, isEditing)}
                />
              </div>

              <div>
                <label className={labelClass(darkMode)}>Contact Number</label>
                <input
                  type="text"
                  value={selectedCase.contactNumber || ""}
                  disabled={!isEditing}
                  maxLength={11}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setSelectedCase({ ...selectedCase, contactNumber: value });
                  }}
                  className={fieldClass(darkMode, isEditing)}
                />
              </div>

              <div>
                <label className={labelClass(darkMode)}>Status</label>
                <select
                  disabled={!isEditing}
                  value={selectedCase.status}
                  onChange={(e) => setSelectedCase({ ...selectedCase, status: e.target.value })}
                  className={fieldClass(darkMode, isEditing)}
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="mt-6">
              <label className={labelClass(darkMode)}>Incident Type</label>
              <select
                disabled={!isEditing}
                value={selectedCase.incidentType}
                onChange={(e) => setSelectedCase({ ...selectedCase, incidentType: e.target.value })}
                className={`${fieldClass(darkMode, isEditing)} mt-2`}
              >
                <option>Academic</option>
                <option>Behavioral</option>
                <option>Safety/Health</option>
                <option>Property Damage</option>
                <option>Other</option>
              </select>
            </div>

            <div className="mt-6">
              <label className={labelClass(darkMode)}>Incident Description</label>
              <textarea
                disabled={!isEditing}
                value={selectedCase.offense}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Za-z\s,.]/g, "");
                  setSelectedCase({ ...selectedCase, offense: value });
                }}
                className={`${fieldClass(darkMode, isEditing)} h-28 mt-2`}
              />
            </div>

            <div className="mt-5">
              <label className={labelClass(darkMode)}>Immediate Actions Taken</label>
              <textarea
                disabled={!isEditing}
                value={selectedCase.sanctions}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Za-z\s,.]/g, "");
                  setSelectedCase({ ...selectedCase, sanctions: value });
                }}
                className={`${fieldClass(darkMode, isEditing)} h-28 mt-2`}
              />
            </div>

            <div className="mt-5">
              <label className={labelClass(darkMode)}>Follow-up Actions / Recommendations</label>
              <textarea
                disabled={!isEditing}
                value={selectedCase.decision}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Za-z\s,.]/g, "");
                  setSelectedCase({ ...selectedCase, decision: value });
                }}
                className={`${fieldClass(darkMode, isEditing)} h-28 mt-2`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}