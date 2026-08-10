import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { FaEye, FaTrash, FaArrowLeft } from "react-icons/fa";
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

const emptyStudent = {
  studentId: "",
  name: "",
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

export default function CaseRecords({ cases: casesProp, setActivePage, isSDO, darkMode }) {
  const [showModal, setShowModal] = useState(false);
  const [localCases, setLocalCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [selectedCase, setSelectedCase] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Use the parent-supplied realtime `cases` prop when available (e.g. from
  // sdoHomepage.jsx's onSnapshot listener); otherwise fetch once ourselves
  // so this component still works standalone.
  const usingOwnCases = casesProp === undefined;
  const cases = usingOwnCases ? localCases : casesProp;

  const handleView = (item) => {
    setSelectedCase(item);
    setIsEditing(false);
    setShowViewModal(true);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this case?");
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

      if (usingOwnCases) {
        setLocalCases((prev) => prev.filter((c) => c.id !== id));
      }
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

      const updatedFields = {
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
      };

      await updateDoc(caseRef, updatedFields);

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
    }
  };

  const getOffenseLevel = (item) => {
    const userCases = cases
      .filter((c) => c.studentId === item.studentId && c.name === item.name)
      .sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);

    const index = userCases.findIndex((c) => c.id === item.id);

    if (index === 0) return "WARNING";
    if (index === 1) return "1ST OFFENSE";
    if (index === 2) return "2ND OFFENSE";
    return "3RD OFFENSE";
  };

  const [student, setStudent] = useState(emptyStudent);

  const handleCloseModal = () => {
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

  const handleSave = async () => {
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

    if (!/^\d{9}$/.test(student.studentId)) {
      alert("Student ID must be exactly 9 digits.");
      return;
    }

    if (!/^[A-Za-z\s,.]+$/.test(student.name)) {
      alert("Student Name can only contain letters, spaces, commas, and periods.");
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

      if (usingOwnCases) {
        setLocalCases((prev) => [...prev, { ...newCase, id: docRef.id }]);
      }

      setStudent(emptyStudent);
      setShowModal(false);
    } catch (error) {
      console.error("SAVE ERROR:", error);
      alert("Failed to save case. Please try again.");
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

  const filteredCases = cases.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      item.studentId?.toLowerCase().includes(term)
    );
  });

  return (
    <div className={`h-screen overflow-hidden flex flex-col space-y-6 p-6 ${darkMode ? "bg-gray-950" : "bg-pink-50/60"}`}>
      {/* HEADER */}
      <div
        className={`backdrop-blur-xl rounded-3xl p-8 shadow-md border ${
          darkMode ? "bg-gray-900 border-gray-700" : "bg-white/70 border-white"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* LEFT */}
          <div>
            {isSDO && setActivePage && (
              <button
                onClick={() => setActivePage("dashboard")}
                className={`inline-flex items-center gap-2 text-sm font-medium mb-3 transition ${
                  darkMode ? "text-gray-400 hover:text-pink-400" : "text-gray-500 hover:text-pink-600"
                }`}
              >
                <FaArrowLeft size={12} />
                Back to dashboard
              </button>
            )}

            <h1 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
              Disciplinary Management
            </h1>

            <p className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Manage disciplinary records, sanctions, and case resolutions.
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex flex-wrap justify-start lg:justify-end gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-pink-500 hover:bg-pink-600 transition text-white px-5 py-3 rounded-xl shadow-md font-semibold"
            >
              + Add Case
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className={`rounded-3xl shadow-md p-4 sm:p-6 overflow-x-auto ${darkMode ? "bg-gray-900 border border-gray-700" : "bg-white"}`}>
        <div className="min-w-[1100px]">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
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

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={darkMode ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-700"}>
                <th className="p-4 rounded-l-xl">Case Number</th>
                <th className="p-4">Student ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Program</th>
                <th className="p-4">Year & Section</th>
                <th className="p-4">Incident Type</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Status</th>
                <th className="p-4">Offense Level</th>
                
              </tr>
            </thead>

            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan="10" className={`text-center p-6 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                    No disciplinary records yet.
                  </td>
                </tr>
              ) : (
                [...filteredCases].reverse().map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleView(item)}
                    className={`border-b transition cursor-pointer ${
                      darkMode ? "border-gray-700 hover:bg-gray-800" : "hover:bg-pink-50"
                    }`}
                  >
                    <td className="p-4 font-semibold text-pink-500">{item.caseNumber}</td>
                    <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>{item.studentId}</td>
                    <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>{item.name}</td>
                    <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>{item.program}</td>
                    <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                      {item.yearLevel} - {item.section}
                    </td>
                    <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                      {item.incidentType === "Other" ? item.otherIncident : item.incidentType}
                    </td>
                    <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>{item.contactNumber || "N/A"}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          darkMode ? "bg-yellow-900 text-yellow-300" : "bg-yellow-100 text-yellow-700"
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
      </div>

      {/* ADD CASE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div
            className={`rounded-3xl shadow-2xl w-full w-[95%] sm:max-w-4xl p-8 overflow-y-auto max-h-[95vh] ${
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
                className={`text-3xl transition ${
                  darkMode ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"
                }`}
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
                <div>
                  <label className={labelClass(darkMode)}>Student ID *</label>
                  <input
                    type="text"
                    name="studentId"
                    maxLength={9}
                    required
                    value={student.studentId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setStudent({ ...student, studentId: value });
                    }}
                    placeholder="9-digit ID Number"
                    className={fieldClass(darkMode)}
                  />
                  {student.studentId.length > 0 && student.studentId.length < 9 && (
                    <p className="text-red-500 text-xs mt-1">Student ID must be 9 digits.</p>
                  )}
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Student Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={student.name}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-zA-Z,\s]/g, "");
                      setStudent({ ...student, name: value });
                    }}
                    placeholder="Lastname, Firstname M.I"
                    className={fieldClass(darkMode)}
                  />
                </div>

                <div>
                  <label className={labelClass(darkMode)}>Program *</label>
                  <select name="program" required value={student.program} onChange={handleChange} className={fieldClass(darkMode)}>
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
                    value={student.section}
                    onChange={handleChange}
                    placeholder="Ex: BSIT-3A"
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
                className={`px-6 py-3 rounded-xl transition font-semibold ${
                  darkMode ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Close
              </button>

              <button
                onClick={handleSave}
                className="px-7 py-3 rounded-xl bg-[#ff6699] hover:bg-[#ff4f8b] transition text-white font-semibold shadow-lg"
              >
                Save Case
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#ff6699]">Case Details</h2>
                <p className={darkMode ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                  View disciplinary record information.
                </p>
              </div>

              <div className="flex gap-2">
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
                      className={`px-4 py-2 rounded-xl ${darkMode ? "bg-gray-800 text-gray-200" : "bg-gray-300"}`}
                    >
                      Cancel Edit
                    </button>

                    <button
                      onClick={handleUpdate}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
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
                  className={`text-2xl ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-500"}`}
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

              <div>
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
                <label className={labelClass(darkMode)}>Student Name</label>
                <input
                  value={selectedCase.name}
                  disabled={!isEditing}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z\s,.]/g, "");
                    setSelectedCase({ ...selectedCase, name: value });
                  }}
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
                  onChange={(e) => setSelectedCase({ ...selectedCase, section: e.target.value })}
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