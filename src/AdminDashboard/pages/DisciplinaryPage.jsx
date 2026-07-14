import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc,  updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
// import PendingApprovalPage from "../Disciplinary/PendingApprovalPage";
// import CaseRecords from "../Disciplinary/CaseRecords";
import { FaEye, FaTrash, FaClipboardCheck, FaPlus, FaSearch, FaTimes, FaUserGraduate, FaMapMarkerAlt, FaPhoneAlt, FaCalendarAlt, FaExclamationTriangle, FaCheckCircle, FaHourglassHalf, FaPen,} from "react-icons/fa";
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

export default function DisciplinaryPage({ darkMode }) {
  const [showModal, setShowModal] = useState(false);
  const [activePage, setActivePage] = useState("main");
  const [cases, setCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleView = (item) => {
  setSelectedCase(item);
  setIsEditing(false);
  setShowViewModal(true);
};
  
  
const handleDelete = async (id) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this case?"
  );

  if (!confirmDelete) return;

  // AUDIT TRAIL: capture the case data before it's removed from Firestore
  const caseToDelete = cases.find((c) => c.id === id);

  try {
    await deleteDoc(doc(db, "cases", id));

    await logAudit({
      action: "Deleted Case",
      module: "Cases",
      documentId: id,
      documentTitle: caseToDelete?.caseNumber || "",
      performedBy: getCurrentUser(),
      oldData: caseToDelete || null,
      description: `Disciplinary case ${caseToDelete?.caseNumber || id} was deleted.`,
    });

    alert("Case deleted successfully.");

    window.location.reload();
  } catch (error) {
    console.error(error);
    alert("Failed to delete case.");
  }
};
  
    const handleUpdate = async () => {
      try {
        const caseRef = doc(db, "cases", selectedCase.id);

        // AUDIT TRAIL: the original (pre-edit) case is still intact in the
        // `cases` list state, since selectedCase edits work on a separate copy.
        const oldCaseData = cases.find((c) => c.id === selectedCase.id) || null;

        await updateDoc(caseRef, {
          studentId: selectedCase.studentId,
          name: selectedCase.name,
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
        });

        await logAudit({
          action: "Edited Case",
          module: "Cases",
          documentId: selectedCase.id,
          documentTitle: selectedCase.caseNumber || "",
          performedBy: getCurrentUser(),
          oldData: oldCaseData,
          newData: selectedCase,
          description: `Disciplinary case ${selectedCase.caseNumber} was updated.`,
        });

        alert("Case updated successfully.");

        setIsEditing(false);
        setShowViewModal(false);

        window.location.reload();
      } catch (error) {
        console.error("Update Error:", error);
        alert(error.message);
      }
    };
  
  const getOffenseLevel = (item) => {
    const userCases = cases
      .filter(
        (c) =>
          c.studentId === item.studentId &&
          c.name === item.name
      )
      .sort((a, b) => {
        return a.createdAt?.seconds - b.createdAt?.seconds;
      });
  
    const index = userCases.findIndex((c) => c.id === item.id);
  
    if (index === 0) return "WARNING";
    if (index === 1) return "1ST OFFENSE";
    if (index === 2) return "2ND OFFENSE";
    return "3RD OFFENSE";
  };
  

  const [student, setStudent] = useState({
    studentId: "",
    name: "",
    program: "",
    yearLevel: "",
    section: "",
    incidentDate: "",
    location: "",
    contactNumber: "", 
    status: "",
    incidentType: "",
    otherIncident: "",
    offense: "",
    sanctions: "",
    decision: "",
    
  });


  const handleCloseModal = () => {
  setStudent({
    studentId: "",
    name: "",
    program: "",
    yearLevel: "",
    section: "",
    incidentDate: "",
    location: "",
    contactNumber: "",
    status: "",
    incidentType: "",
    otherIncident: "",
    offense: "",
    sanctions: "",
    decision: "",
  });

  setShowModal(false);
};

  // CASE NUMBER
const [caseNumber, setCaseNumber] = useState("");

useEffect(() => {
  if (cases) {
    const getNextCaseNumber = (cases) => {
      if (!cases || cases.length === 0) {
        return "CASE-0000001";
      }

      const maxNumber = Math.max(
        ...cases.map((c) => {
          const num = c.caseNumber?.replace("CASE-", "");
          return parseInt(num || "0", 10);
        })
      );

      const next = maxNumber + 1;

      return `CASE-${String(next).padStart(7, "0")}`;
    };

    setCaseNumber(getNextCaseNumber(cases));
  }
}, [cases]);

  const handleChange = (e) => {
    setStudent({
      ...student,
      [e.target.name]: e.target.value,
    });
  };



const handleSave = async () => {
  
  if (isSaving) return;
  // Required fields
  if (
    !student.studentId.trim() ||
    !student.name.trim() ||
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

  // Student ID must be exactly 9 digits
  if (!/^\d{9}$/.test(student.studentId)) {
    alert("Student ID must be exactly 9 digits.");
    return;
  }

  // Student Name: letters, spaces, comma and period only
  if (!/^[A-Za-z\s,.]+$/.test(student.name)) {
    alert(
      "Student Name can only contain letters, spaces, commas, and periods."
    );
    return;
  }

  // If incident type is Other
  if (
    student.incidentType === "Other" &&
    !student.otherIncident.trim()
  ) {
    alert("Please specify the incident type.");
    return;
  }

  // No future incident date
  const today = new Date().toISOString().split("T")[0];

  if (student.incidentDate > today) {
    alert("Date of Incident cannot be a future date.");
    return;
  }

  // Contact Number (optional)
  if (
    student.contactNumber &&
    !/^09\d{9}$/.test(student.contactNumber)
  ) {
    alert("Contact Number must be a valid 11-digit mobile number.");
    return;
  }

  setIsSaving(true);

  try {
    const newCase = {
      ...student,
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
      performedBy: getCurrentUser(),
      newData: newCase,
      description: `New disciplinary case ${caseNumber} was added.`,
    });

    setCases((prev) => [
      ...prev,
      {
        ...newCase,
        id: docRef.id,
      },
    ]);

    alert("Disciplinary Case Created!");

    setStudent({
      studentId: "",
      name: "",
      program: "",
      yearLevel: "",
      section: "",
      incidentDate: "",
      location: "",
      contactNumber: "",
      incidentType: "",
      otherIncident: "",
      offense: "",
      sanctions: "",
      decision: "",
    });

    setShowModal(false);

  } catch (error) {
    console.error("SAVE ERROR:", error);
    alert("Failed to create a case. Please try again.");
  }finally {
    setIsSaving(false);
  }
};

useEffect(() => {
  const fetchCases = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "cases"));

      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCases(data);
    } catch (error) {
      console.error("FETCH ERROR:", error);
    }
  };

  fetchCases();
}, []);

const filteredCases = cases.filter((item) => {
  const term = searchTerm.toLowerCase();

  return (
    item.name?.toLowerCase().includes(term) ||
    item.studentId?.toLowerCase().includes(term)
  );
});

  // Read-only stats derived from the existing `cases` state — no fetch/save logic added.
  const totalCases = cases.length;
  const inProgressCount = cases.filter(
    (c) => c.status === "in-progress" || c.status === "In Progress"
  ).length;
  const closedCount = cases.filter((c) => c.status === "Closed").length;

  const offenseBadgeClasses = (level) => {
    if (level === "WARNING")
      return darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-700";
    if (level === "1ST OFFENSE")
      return darkMode ? "bg-yellow-900 text-yellow-300" : "bg-yellow-100 text-yellow-700";
    if (level === "2ND OFFENSE")
      return darkMode ? "bg-orange-900 text-orange-300" : "bg-orange-100 text-orange-700";
    return darkMode ? "bg-red-900 text-red-300" : "bg-red-100 text-red-700";
  };

  const inputBase = `w-full mt-1.5 border rounded-xl p-3 text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-pink-400 focus:border-transparent ${
    darkMode
      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
      : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
  }`;

  const disabledInputBase = (editing) =>
    `w-full mt-1.5 border rounded-xl p-3 text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-pink-400 focus:border-transparent ${
      darkMode
        ? `border-slate-700 text-white ${editing ? "bg-slate-800" : "bg-slate-800/40"}`
        : `border-gray-200 text-gray-800 ${editing ? "bg-white" : "bg-gray-50"}`
    }`;

  const labelBase = `text-xs font-semibold uppercase tracking-wide ${
    darkMode ? "text-slate-400" : "text-gray-500"
  }`;

  return (
    <div
        className={`h-screen overflow-hidden flex flex-col space-y-6 p-4 sm:p-6 ${
          darkMode
            ? "bg-slate-950"
            : "bg-slate-50"
        }`}
      >
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">

      {/* HEADER */}
     <div
        className={`backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-sm border ${
          darkMode
            ? "bg-slate-900/70 border-slate-700"
            : "bg-white/70 border-white/60"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          {/* LEFT */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent"
              >
                Disciplinary Management
              </h1>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                  darkMode
                    ? "bg-pink-500/15 text-pink-300 border border-pink-500/30"
                    : "bg-pink-100 text-pink-600 border border-pink-200"
                }`}
              >
                Case Management
              </span>
            </div>

            <p
              className={`mt-2 text-sm sm:text-base ${
                darkMode ? "text-slate-300" : "text-gray-500"
              }`}
            >
              Manage disciplinary records, incidents, and case resolutions.
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex flex-wrap justify-start lg:justify-end gap-3">

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 transition text-white px-5 py-3 rounded-xl shadow-sm shadow-pink-500/30 font-semibold"
            >
              <FaPlus className="text-xs" /> Add Case
            </button>

            {/* <button
              onClick={() => setActivePage("pending")}
              className="bg-pink-500 hover:bg-pink-600 transition text-white px-5 py-3 rounded-xl shadow-md font-semibold"
            >
              Pending Approval
            </button> */}

          </div>

        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div
          className={`rounded-2xl p-5 shadow-sm border ${
            darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
              Total Cases
            </p>
            <FaClipboardCheck className={darkMode ? "text-pink-400" : "text-pink-500"} />
          </div>
          <h2 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
            {totalCases}
          </h2>
        </div>

        <div
          className={`rounded-2xl p-5 shadow-sm border ${
            darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
              In Progress
            </p>
            <FaHourglassHalf className="text-yellow-500" />
          </div>
          <h2 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
            {inProgressCount}
          </h2>
        </div>

        <div
          className={`col-span-2 sm:col-span-1 rounded-2xl p-5 shadow-sm border ${
            darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
              Closed
            </p>
            <FaCheckCircle className="text-emerald-500" />
          </div>
          <h2 className={`text-3xl font-bold mt-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
            {closedCount}
          </h2>
        </div>
      </div>

          {/* TABLE */}
          <div
            className={`rounded-3xl shadow-sm border p-4 sm:p-6 overflow-x-auto ${
              darkMode
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-gray-100"
            }`}
          >
            <div className="min-w-[1100px]">

              {/* HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <h2
                  className={`text-lg font-bold ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  Case Records
                </h2>

                <div className="relative w-full sm:w-96">
                  <FaSearch
                    className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs ${
                      darkMode ? "text-slate-500" : "text-gray-400"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Search by last name or student ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full rounded-xl pl-10 pr-4 py-2.5 border text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all ${
                      darkMode
                        ? "border-slate-700 bg-slate-800 text-white placeholder-slate-500"
                        : "border-gray-200 bg-gray-50 placeholder-gray-400"
                    }`}
                  />
                </div>
              </div>

              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Case Number</th>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Student ID</th>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Name</th>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Program</th>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Year & Section</th>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Incident Type</th>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Contact</th>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Status</th>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Offense Level</th>
                    <th className={`p-3 text-xs font-semibold uppercase tracking-wider text-center ${darkMode ? "text-slate-400" : "text-gray-500"}`}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {cases.length === 0 ? (
                    <tr>
                      <td
                        colSpan="10"
                        className={`text-center p-10 ${
                          darkMode ? "text-slate-500" : "text-gray-400"
                        }`}
                      >
                        No disciplinary records yet.
                      </td>
                    </tr>
                  ) : (
                    [...filteredCases].reverse().map((item, idx) => {
                      const level = getOffenseLevel(item);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleView(item)}
                          className={`cursor-pointer transition-colors duration-150 ${
                            darkMode
                              ? `hover:bg-slate-800/60 ${idx % 2 === 0 ? "bg-slate-800/30" : "bg-transparent"}`
                              : `hover:bg-pink-50/60 ${idx % 2 === 0 ? "bg-gray-50/60" : "bg-transparent"}`
                          }`}
                        >
                          <td className={`p-3.5 rounded-l-xl font-semibold ${darkMode ? "text-pink-400" : "text-pink-600"}`}>
                            {item.caseNumber}
                          </td>

                          <td className={`p-3.5 ${darkMode ? "text-slate-200" : "text-gray-700"}`}>
                            {item.studentId}
                          </td>

                          <td className={`p-3.5 font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                            {item.name}
                          </td>

                          <td className={`p-3.5 ${darkMode ? "text-slate-200" : "text-gray-700"}`}>
                            {item.program}
                          </td>

                          <td className={`p-3.5 ${darkMode ? "text-slate-200" : "text-gray-700"}`}>
                            {item.yearLevel} - {item.section}
                          </td>

                          <td className={`p-3.5 ${darkMode ? "text-slate-200" : "text-gray-700"}`}>
                            {item.incidentType === "Other"
                              ? item.otherIncident
                              : item.incidentType}
                          </td>

                          <td className={`p-3.5 ${darkMode ? "text-slate-200" : "text-gray-700"}`}>
                            {item.contactNumber || "N/A"}
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                darkMode
                                  ? "bg-yellow-900 text-yellow-300"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${offenseBadgeClasses(level)}`}
                            >
                              {level}
                            </span>
                          </td>

                          <td className="p-3.5 rounded-r-xl">
                            <div
                              className="flex items-center justify-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >

                              <button
                                onClick={() => handleDelete(item.id)}
                                className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition shadow-sm"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

            </div>
          </div>

      {/* ADD CASE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-3 sm:px-4">

          <div
            className={`rounded-3xl shadow-2xl w-full sm:max-w-4xl p-5 sm:p-8 overflow-y-auto max-h-[95vh] border ${
              darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
            }`}
          >

            {/* HEADER */}
            <div className="flex justify-between items-start mb-6">

              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-pink-400" : "text-pink-500"}`}>
                  New Record
                </p>
                <h2 className={`text-2xl sm:text-3xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                  Add Disciplinary Case
                </h2>
                <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                  Create and manage disciplinary records.
                </p>
              </div>

              <button
                onClick={handleCloseModal}
                className={`p-2 rounded-full transition ${
                  darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-red-400" : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
                }`}
              >
                <FaTimes className="text-lg" />
              </button>
            </div>

            {/* CASE DETAILS */}
            <div
              className={`rounded-2xl p-5 mb-6 border ${
                darkMode ? "bg-slate-800/50 border-slate-700" : "bg-pink-50 border-pink-100"
              }`}
            >

              <div className="grid md:grid-cols-2 gap-4">

                {/* CASE NUMBER */}
                <div>
                  <label className={labelBase}>Case Number</label>

                  <input
                    type="text"
                    value={caseNumber}
                    disabled
                    className={`w-full mt-1.5 border rounded-xl p-3 font-bold ${
                      darkMode ? "bg-slate-800 border-slate-700 text-pink-400" : "bg-white border-gray-200 text-pink-500"
                    }`}
                  />
                </div>

                {/* DATE CREATED */}
                <div>
                  <label className={labelBase}>Date Created</label>

                  <input
                    type="text"
                    value={new Date().toLocaleDateString()}
                    disabled
                    className={`w-full mt-1.5 border rounded-xl p-3 ${
                      darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-gray-200 text-gray-600"
                    }`}
                  />
                </div>

              </div>
            </div>

            {/* STUDENT INFO */}
            <div className="mb-8">

              <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
                <FaUserGraduate className="text-pink-500" /> Student Information Records
              </h3>

              <div className="grid md:grid-cols-2 gap-5">

                {/* STUDENT ID */}
                <div>
                  <label className={labelBase}>Student ID *</label>

                  <input
                    type="text"
                    required
                    name="studentId"
                    maxLength={9}
                    value={student.studentId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setStudent({
                        ...student,
                        studentId: value,
                      });
                    }}
                    placeholder="9-digit ID Number"
                    className={inputBase}
                  />

                  {student.studentId.length > 0 &&
                    student.studentId.length < 9 && (
                      <p className="text-red-500 text-xs mt-1">
                        Student ID must be 9 digits.
                      </p>
                    )}
                </div>

                {/* NAME */}
                <div>
                  <label className={labelBase}>Student Name *</label>

                    <input
                      type="text"
                      name="name"
                      required
                      value={student.name}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^a-zA-Z,\s]/g, "");

                        setStudent({
                          ...student,
                          name: value,
                        });
                      }}
                      placeholder="Lastname, Firstname M.I"
                      className={inputBase}
                    />
                </div>

                {/* PROGRAM */}
                <div>
                  <label className={labelBase}>Program *</label>

                  <select
                    name="program"
                    required
                    value={student.program}
                    onChange={handleChange}
                    className={inputBase}
                  >
                    <option value="">Select Program</option>

                    <option>Bachelor of Arts in Political Science (B.A. Pol. Sci)</option>
                    <option>Bachelor of Elementary Education (BEED)</option>
                    <option>Bachelor of Secondary Education (BSED) English</option>
                    <option>Bachelor of Secondary Education (BSED) Mathematics</option>
                    <option>Bachelor of Science in Tourism Management (BSTM)</option>
                    <option>Bachelor of Science in Hospitality Management (BSHM)</option>
                    <option>Bachelor of Science in Information Technology (BSIT)</option>
                    <option>Bachelor of Science in Business Administration (BSBA)</option>
                    <option>Bachelor of Science in Accountancy (BSA)</option>
                    <option>Bachelor of Science in Criminology (B.S. Crim.)</option>
                  </select>
                </div>

                {/* YEAR */}
                <div>
                  <label className={labelBase}>Year Level *</label>

                  <select
                    name="yearLevel"
                    required
                    value={student.yearLevel}
                    onChange={handleChange}
                    className={inputBase}
                  >
                    <option value="">Select Year Level</option>
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                  </select>
                </div>

                {/* SECTION */}
                <div>
                  <label className={labelBase}>Section *</label>

                  <input
                    type="text"
                    name="section"
                    required
                    value={student.section}
                    onChange={handleChange}
                    placeholder="Ex: BSIT-3A"
                    className={inputBase}
                  />
                </div>

                {/* INCIDENT DATE */}
                <div>
                  <label className={labelBase}>Date of Incident *</label>

                        <input
                          type="date"
                          name="incidentDate"
                          required
                          max={new Date().toISOString().split("T")[0]}
                          value={student.incidentDate}
                          onChange={handleChange}
                          className={inputBase}
                        />
                </div>

                {/* LOCATION */}
                <div className="md:col-span-2">
                  <label className={labelBase}>Location of Incident *</label>

                  <input
                    type="text"
                    name="location"
                    required
                    value={student.location}
                    onChange={handleChange}
                    placeholder="Where did the incident happen?"
                    className={inputBase}
                  />
                </div>

                  {/* CONTACT NUMBER (NEW) */}
                <div>
                  <label className={labelBase}>Contact Number (optional)</label>

                  <input
                    type="text"
                    name="contactNumber"
                    value={student.contactNumber}
                    onChange={handleChange}
                    placeholder="09xxxxxxxxx"
                    className={inputBase}
                  />
                </div>
                {/* STATUS */}
                  <div>
                    <label className={labelBase}>Status *</label>

                    <select
                      name="status"
                      value={student.status}
                      onChange={handleChange}
                      className={inputBase}
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>


              </div>
            </div>

            {/* TYPE OF INCIDENT */}
            <div className="mb-8">

              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
                <FaExclamationTriangle className="text-pink-500" /> Type of Incident *
              </h3>

              <div className="flex flex-wrap gap-3">

                {[
                  "Academic",
                  "Behavioral",
                  "Safety/Health",
                  "Property Damage",
                  "Other",
                ].map((type) => (
                  <label
                    key={type}
                    className={`px-5 py-3 rounded-full border cursor-pointer transition font-medium text-sm
                    ${
                      student.incidentType === type
                        ? "bg-pink-500 text-white border-pink-500 shadow-sm shadow-pink-500/30"
                        : darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-pink-400"
                        : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-pink-50 hover:border-pink-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="incidentType"
                      required
                      value={type}
                      className="hidden"
                      onChange={handleChange}
                    />

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
                  className={`${inputBase} mt-4`}
                />
              )}
            </div>

            {/* NARRATIVE */}
            <div className="mb-8">

              <h3 className={`text-lg font-bold mb-3 ${darkMode ? "text-white" : "text-gray-800"}`}>
                Incident Description Narrative *
              </h3>

              <textarea
                name="offense"
                required
                value={student.offense}
                onChange={handleChange}
                placeholder="Describe the incident in detail..."
                className={`${inputBase} h-32 resize-none`}
              />

            </div>

            {/* IMMEDIATE ACTION */}
            <div className="mb-8">

              <h3 className={`text-lg font-bold mb-3 ${darkMode ? "text-white" : "text-gray-800"}`}>
                Immediate Actions Taken *
              </h3>

              <textarea
                name="sanctions"
                required
                value={student.sanctions}
                onChange={handleChange}
                placeholder="Enter actions immediately taken..."
                className={`${inputBase} h-28 resize-none`}
              />

            </div>

            {/* FOLLOW UP */}
            <div className="mb-8">

              <h3 className={`text-lg font-bold mb-3 ${darkMode ? "text-white" : "text-gray-800"}`}>
                Follow-up Actions / Recommendations *
              </h3>

              <textarea
                name="decision"
                required
                value={student.decision}
                onChange={handleChange}
                placeholder="Enter recommendations or follow-up actions..."
                className={`${inputBase} h-28 resize-none`}
              />

            </div>

            {/* FOOTER */}
            <div className={`flex justify-end gap-3 pt-4 border-t ${darkMode ? "border-slate-700" : "border-gray-100"}`}>

              <button
                onClick={handleCloseModal}
                className={`px-6 py-3 rounded-xl font-semibold transition ${
                  darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Close
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-7 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 transition text-white font-semibold shadow-sm shadow-pink-500/30"
              >
                {isSaving ? "Creating Case..." : "Create Case"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* VIEW / EDIT MODAL */}
      {showViewModal && selectedCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">

          <div
            className={`rounded-3xl p-5 sm:p-7 w-full max-w-3xl max-h-[90vh] overflow-y-auto border ${
              darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
            }`}
          >

            {/* HEADER */}
            <div className="flex justify-between items-start mb-6 gap-3">

              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? "text-pink-400" : "text-pink-500"}`}>
                  {isEditing ? "Editing Record" : "Case Details"}
                </p>
                <h2 className={`text-xl sm:text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {selectedCase.caseNumber}
                </h2>
                <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                  View disciplinary record information.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">

                {!isEditing ? (

                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm shadow-pink-500/30 transition"
                  >
                    <FaPen className="text-xs" /> Edit
                  </button>

                ) : (

                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                        darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      Cancel Edit
                    </button>

                    <button
                      onClick={handleUpdate}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition"
                    >
                      Save Changes
                    </button>
                  </>

                )}

                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setIsEditing(false);
                  }}
                  className={`p-2 rounded-full transition ${
                    darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-red-400" : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
                  }`}
                >
                  <FaTimes className="text-lg" />
                </button>

              </div>

            </div>

            {/* OFFENSE LEVEL BADGE */}
            <div className="mb-5">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${offenseBadgeClasses(getOffenseLevel(selectedCase))}`}
              >
                {getOffenseLevel(selectedCase)}
              </span>
            </div>

            {/* GRID INFO */}
            
                  <div className="grid md:grid-cols-2 gap-4">

                      {/* Case Number */}
                      <div>
                        <label className={labelBase}>Case Number</label>
                        <input
                          value={selectedCase.caseNumber}
                          disabled
                          className={disabledInputBase(false)}
                        />
                      </div>
                      
                        {/* Date Created */}
                        <div>
                          <label className={labelBase}>Date Created</label>

                          <input
                            value={
                              selectedCase.createdAt?.toDate
                                ? selectedCase.createdAt.toDate().toLocaleDateString()
                                : ""
                            }
                            disabled
                            className={disabledInputBase(false)}
                          />
                        </div>
                      {/* Student ID */}
                      <div>
                        <label className={labelBase}>Student ID</label>
                            <input
                              type="text"
                              value={selectedCase.studentId}
                              disabled={!isEditing}
                              maxLength={9}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 9);

                                setSelectedCase({
                                  ...selectedCase,
                                  studentId: value,
                                });
                              }}
                              className={disabledInputBase(isEditing)}
                            />
                      </div>

                      {/* Student Name */}
                      <div>
                        <label className={labelBase}>Student Name</label>
                        <input
                          value={selectedCase.name}
                          disabled={!isEditing}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^A-Za-z\s,.]/g, "");

                              setSelectedCase({
                                ...selectedCase,
                                name: value,
                              });
                            }}
                          className={disabledInputBase(isEditing)}
                        />
                      </div>

                      {/* Program */}
                      <div>
                        <label className={labelBase}>Program</label>

                        <select
                          disabled={!isEditing}
                          value={selectedCase.program}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              program: e.target.value,
                            })
                          }
                          className={disabledInputBase(isEditing)}
                        >
                          <option>Bachelor of Arts in Political Science (B.A. Pol. Sci)</option>
                          <option>Bachelor of Elementary Education (BEED)</option>
                          <option>Bachelor of Secondary Education (BSED) English</option>
                          <option>Bachelor of Secondary Education (BSED) Mathematics</option>
                          <option>Bachelor of Science in Tourism Management (BSTM)</option>
                          <option>Bachelor of Science in Hospitality Management (BSHM)</option>
                          <option>Bachelor of Science in Information Technology (BSIT)</option>
                          <option>Bachelor of Science in Business Administration (BSBA)</option>
                          <option>Bachelor of Science in Accountancy (BSA)</option>
                          <option>Bachelor of Science in Criminology (B.S. Crim.)</option>
                        </select>
                      </div>

                      {/* Year Level */}
                      <div>
                        <label className={labelBase}>Year Level</label>

                        <select
                          disabled={!isEditing}
                          value={selectedCase.yearLevel}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              yearLevel: e.target.value,
                            })
                          }
                          className={disabledInputBase(isEditing)}
                        >
                          <option>1st Year</option>
                          <option>2nd Year</option>
                          <option>3rd Year</option>
                          <option>4th Year</option>
                        </select>
                      </div>

                      {/* Section */}
                      <div>
                        <label className={labelBase}>Section</label>

                        <input
                          value={selectedCase.section}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              section: e.target.value,
                            })
                          }
                          className={disabledInputBase(isEditing)}
                        />
                      </div>

                      {/* Incident Date */}
                      <div>
                        <label className={labelBase}>Incident Date</label>

                        <input
                          type="date"
                          value={selectedCase.incidentDate}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              incidentDate: e.target.value,
                            })
                          }
                          className={disabledInputBase(isEditing)}
                        />
                      </div>

                      {/* Location */}
                      <div className="md:col-span-2">
                        <label className={labelBase}>Location</label>

                        <input
                          value={selectedCase.location}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              location: e.target.value,
                            })
                          }
                          className={disabledInputBase(isEditing)}
                        />
                      </div>

                            {/* Contact */}
                          <div>
                            <label className={labelBase}>Contact Number</label>

                            <input
                              type="text"
                              value={selectedCase.contactNumber || ""}
                              disabled={!isEditing}
                              maxLength={11}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 11);

                                setSelectedCase({
                                  ...selectedCase,
                                  contactNumber: value,
                                });
                              }}
                              className={disabledInputBase(isEditing)}
                            />
                          </div>

                      {/* Status */}
                      <div>
                        <label className={labelBase}>Status</label>

                        <select
                          disabled={!isEditing}
                          value={selectedCase.status}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              status: e.target.value,
                            })
                          }
                          className={disabledInputBase(isEditing)}
                        >
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>

                    </div>

            {/* DESCRIPTION */}
              <div className="mt-6">
                <label className={labelBase}>Incident Type</label>

                <select
                  disabled={!isEditing}
                  value={selectedCase.incidentType}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      incidentType: e.target.value,
                    })
                  }
                  className={disabledInputBase(isEditing)}
                >
                  <option>Academic</option>
                  <option>Behavioral</option>
                  <option>Safety/Health</option>
                  <option>Property Damage</option>
                  <option>Other</option>
                </select>
              </div>


                <div className="mt-6">
                  <label className={labelBase}>
                    Incident Description
                  </label>

                  <textarea
                    disabled={!isEditing}
                    value={selectedCase.offense}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^A-Za-z\s,.]/g, "");

                        setSelectedCase({
                          ...selectedCase,
                          offense: value,
                        });
                      }}
                    className={`${disabledInputBase(isEditing)} h-28 resize-none`}
                  />
                </div>

                    <div className="mt-5">
                      <label className={labelBase}>
                        Immediate Actions Taken
                      </label>

                      <textarea
                        disabled={!isEditing}
                        value={selectedCase.sanctions}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^A-Za-z\s,.]/g, "");

                              setSelectedCase({
                                ...selectedCase,
                                sanctions: value,
                              });
                            }}
                        className={`${disabledInputBase(isEditing)} h-28 resize-none`}
                      />
                    </div>

                    <div className="mt-5">
                      <label className={labelBase}>
                        Follow-up Actions / Recommendations
                      </label>

                      <textarea
                        disabled={!isEditing}
                        value={selectedCase.decision}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^A-Za-z\s,.]/g, "");

                          setSelectedCase({
                            ...selectedCase,
                            decision: value,
                          });
                        }}
                        className={`${disabledInputBase(isEditing)} h-28 resize-none`}
                      />
                    </div>

          </div>

        </div>
      )}
      
      </div>
    </div>
  );
}