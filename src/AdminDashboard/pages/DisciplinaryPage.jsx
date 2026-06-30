import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc,  updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
// import PendingApprovalPage from "../Disciplinary/PendingApprovalPage";
// import CaseRecords from "../Disciplinary/CaseRecords";
import { FaEye, FaTrash, FaClipboardCheck,} from "react-icons/fa";

export default function DisciplinaryPage() {
  const [showModal, setShowModal] = useState(false);
  const [activePage, setActivePage] = useState("main");
  const [cases, setCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);


   const [selectedCase, setSelectedCase] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
  

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

  try {
    await deleteDoc(doc(db, "cases", id));

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

  try {
    const newCase = {
      ...student,
      caseNumber,
      status: "in-progress",
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "cases"), newCase);

    setCases((prev) => [
      ...prev,
      {
        ...newCase,
        id: docRef.id,
      },
    ]);

    alert("Disciplinary Case Saved!");

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
    alert("Failed to save case. Please try again.");
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



     // =========================
  // Case Records PAGE
  // // =========================
  // if (activePage === "records") {
  //   return (
  //     <CaseRecords
  //       cases={cases}
  //       setCases={setCases}
  //       setActivePage={setActivePage}
  //       handleEdit={handleEdit}
  //       handleView={handleView}
  //       handleDelete={handleDelete}
  //     />
  //   );
  // }


const filteredCases = cases.filter((item) => {
  const term = searchTerm.toLowerCase();

  return (
    item.name?.toLowerCase().includes(term) ||
    item.studentId?.toLowerCase().includes(term)
  );
});


const [darkMode, setDarkMode] = useState(() => {
  return localStorage.getItem("theme") === "dark";
});

useEffect(() => {
  if (darkMode) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}, [darkMode]);


  return (
    <div
        className={`h-screen overflow-hidden flex flex-col space-y-6 p-6 ${
          darkMode
            ? "bg-gray-950"
            : "bg-pink-50/60"
        }`}
      >

      {/* HEADER */}
     <div
        className={`backdrop-blur-xl rounded-3xl p-8 shadow-md border ${
          darkMode
            ? "bg-gray-900 border-gray-700"
            : "bg-white/70 border-white"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          {/* LEFT */}
          <div>
           <h1
              className={`text-3xl font-bold ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              Disciplinary Management
            </h1>

            <p
              className={`mt-2 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
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

            {/* <button
              onClick={() => setActivePage("pending")}
              className="bg-pink-500 hover:bg-pink-600 transition text-white px-5 py-3 rounded-xl shadow-md font-semibold"
            >
              Pending Approval
            </button> */}

          </div>

        </div>
      </div>

          {/* TABLE */}
          <div
            className={`rounded-3xl shadow-md p-4 sm:p-6 overflow-x-auto ${
              darkMode
                ? "bg-gray-900 border border-gray-700"
                : "bg-white"
            }`}
          >
            <div className="min-w-[1100px]">

              {/* HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <h2
                  className={`text-xl font-bold ${
                    darkMode ? "text-white" : "text-gray-700"
                  }`}
                >
                  Case Records
                </h2>

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
                  <tr
                    className={
                      darkMode
                        ? "bg-gray-800 text-gray-200"
                        : "bg-gray-100 text-gray-700"
                    }
                  >
                    <th className="p-4 rounded-l-xl">Case Number</th>
                    <th className="p-4">Student ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Program</th>
                    <th className="p-4">Year & Section</th>
                    <th className="p-4">Incident Type</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Offense Level</th>
                    <th className="p-4 rounded-r-xl">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {cases.length === 0 ? (
                    <tr>
                      <td
                        colSpan="10"
                        className={`text-center p-6 ${
                          darkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        No disciplinary records yet.
                      </td>
                    </tr>
                  ) : (
                    [...filteredCases].reverse().map((item, index) => (
                          <tr
                            key={item.id}
                            onClick={() => handleView(item)}
                            className={`border-b transition cursor-pointer ${
                              darkMode
                                ? "border-gray-700 hover:bg-gray-800"
                                : "hover:bg-pink-50"
                            }`}
                          >
                        <td className="p-4 font-semibold text-pink-500">
                          {item.caseNumber}
                        </td>

                        <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                          {item.studentId}
                        </td>

                        <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                          {item.name}
                        </td>

                        <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                          {item.program}
                        </td>

                        <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                          {item.yearLevel} - {item.section}
                        </td>

                        <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                          {item.incidentType === "Other"
                            ? item.otherIncident
                            : item.incidentType}
                        </td>

                        <td className={`p-4 ${darkMode ? "text-gray-200" : ""}`}>
                          {item.contactNumber || "N/A"}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              darkMode
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

                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">

                                <button
                                  onClick={() => handleView(item)}
                                  className="px-3 py-2 rounded-lg  bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition shadow-sm"
                                  title="View"
                                >
                                  <FaEye />
                  
                                </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(item.id);
                                    }}
                                    className="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition shadow-sm"
                                    title="Delete"
                                  >
                                    <FaTrash />
                                  </button>

                              </div>
                            </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

            </div>
          </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">

          <div className="bg-white rounded-3xl shadow-2xl w-full w-[95%] sm:max-w-4xl p-8 overflow-y-auto max-h-[95vh]">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-1">

              <div>
                <h2 className="text-3xl font-bold text-[#ff6699]">
                  Add Disciplinary Case
                </h2>

                <p className="text-gray-500 text-sm">
                  Create and manage disciplinary records.
                </p>
              </div>

              <button
                onClick={handleCloseModal}
                className="text-3xl text-gray-400 hover:text-red-500 transition"
              >
                ✕
              </button>
            </div>

            {/* CASE DETAILS */}
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 mb-1">

              <div className="grid md:grid-cols-2 gap-4">

                {/* CASE NUMBER */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Case Number
                  </label>

                  <input
                    type="text"
                    value={caseNumber}
                    disabled
                    className="w-full mt-1 border rounded-xl p-3 bg-gray-100 font-semibold text-[#ff6699]"
                  />
                </div>

                {/* DATE CREATED */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Date Created
                  </label>

                  <input
                    type="text"
                    value={new Date().toLocaleDateString()}
                    disabled
                    className="w-full mt-1 border rounded-xl p-3 bg-gray-100"
                  />
                </div>

              </div>
            </div>

            {/* STUDENT INFO */}
            <div className="mb-8">

              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Student Information Records
              </h3>

              <div className="grid md:grid-cols-2 gap-5">

                {/* STUDENT ID */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Student ID *
                  </label>

                  <input
                    type="text"
                    required
                    name="studentId"
                    maxLength={9}
                    required
                    value={student.studentId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setStudent({
                        ...student,
                        studentId: value,
                      });
                    }}
                    placeholder="9-digit ID Number"
                    className="w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
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
                  <label className="text-sm font-semibold text-gray-700">
                    Student Name *
                  </label>

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
                      className="w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
                    />
                </div>

                {/* PROGRAM */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Program *
                  </label>

                  <select
                    name="program"
                    required
                    value={student.program}
                    onChange={handleChange}
                    className="w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
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
                  <label className="text-sm font-semibold text-gray-700">
                    Year Level *
                  </label>

                  <select
                    name="yearLevel"
                    required
                    value={student.yearLevel}
                    onChange={handleChange}
                    className="w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
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
                  <label className="text-sm font-semibold text-gray-700">
                    Section *
                  </label>

                  <input
                    type="text"
                    name="section"
                    required
                    value={student.section}
                    onChange={handleChange}
                    placeholder="Ex: BSIT-3A"
                    className="w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
                  />
                </div>

                {/* INCIDENT DATE */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Date of Incident *
                  </label>

                        <input
                          type="date"
                          name="incidentDate"
                          required
                          max={new Date().toISOString().split("T")[0]}
                          value={student.incidentDate}
                          onChange={handleChange}
                          className="w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
                        />
                </div>

                {/* LOCATION */}
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Location of Incident *
                  </label>

                  <input
                    type="text"
                    name="location"
                    required
                    value={student.location}
                    onChange={handleChange}
                    placeholder="Where did the incident happen?"
                    className="w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
                  />
                </div>

                  {/* CONTACT NUMBER (NEW) */}
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Contact Number (optional)
                  </label>

                  <input
                    type="text"
                    name="contactNumber"
                    value={student.contactNumber}
                    onChange={handleChange}
                    placeholder="09xxxxxxxxx"
                    className="w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
                  />
                </div>
                {/* STATUS */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Status *
                    </label>

                    <select
                      name="status"
                      value={student.status}
                      onChange={handleChange}
                      className="w-full mt-1 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>


              </div>
            </div>

            {/* TYPE OF INCIDENT */}
            <div className="mb-8">

              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Type of Incident
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
                    className={`px-5 py-3 rounded-full border cursor-pointer transition font-medium
                    ${
                      student.incidentType === type
                        ? "bg-[#ff6699] text-white border-[#ff6699]"
                        : "bg-gray-100 hover:bg-pink-50"
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
                  className="w-full mt-4 border rounded-xl p-3 focus:ring-2 focus:ring-[#ff6699] outline-none"
                />
              )}
            </div>

            {/* NARRATIVE */}
            <div className="mb-8">

              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Incident Description Narrative
              </h3>

              <textarea
                name="offense"
                required
                value={student.offense}
                onChange={handleChange}
                placeholder="Describe the incident in detail..."
                className="w-full border rounded-2xl p-4 h-32 focus:ring-2 focus:ring-[#ff6699] outline-none"
              />

            </div>

            {/* IMMEDIATE ACTION */}
            <div className="mb-8">

              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Immediate Actions Taken
              </h3>

              <textarea
                name="sanctions"
                required
                value={student.sanctions}
                onChange={handleChange}
                placeholder="Enter actions immediately taken..."
                className="w-full border rounded-2xl p-4 h-28 focus:ring-2 focus:ring-[#ff6699] outline-none"
              />

            </div>

            {/* FOLLOW UP */}
            <div className="mb-8">

              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Follow-up Actions / Recommendations
              </h3>

              <textarea
                name="decision"
                required
                value={student.decision}
                onChange={handleChange}
                placeholder="Enter recommendations or follow-up actions..."
                className="w-full border rounded-2xl p-4 h-28 focus:ring-2 focus:ring-[#ff6699] outline-none"
              />

            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-4">

              <button
                onClick={handleCloseModal}
                className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 transition font-semibold"
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

      {showViewModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">

              <div>
                <h2 className="text-2xl font-bold text-[#ff6699]">
                  Case Details
                </h2>

                <p className="text-gray-500 text-sm">
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
                      className="bg-gray-300 px-4 py-2 rounded-xl"
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
                  className="text-2xl"
                >
                  ✕
                </button>

              </div>

            </div>

            {/* GRID INFO */}
            
                  <div className="grid md:grid-cols-2 gap-4">

                      {/* Case Number */}
                      <div>
                        <label className="font-semibold">Case Number</label>
                        <input
                          value={selectedCase.caseNumber}
                          disabled
                          className="w-full border rounded-xl p-3 bg-gray-100"
                        />
                      </div>
                      
                        {/* Date Created */}
                        <div>
                          <label className="font-semibold">Date Created</label>

                          <input
                            value={
                              selectedCase.createdAt?.toDate
                                ? selectedCase.createdAt.toDate().toLocaleDateString()
                                : ""
                            }
                            disabled
                            className="w-full border rounded-xl p-3 bg-gray-100"
                          />
                        </div>
                      {/* Student ID */}
                      <div>
                        <label className="font-semibold">Student ID</label>
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
                              className={`w-full border rounded-xl p-3 ${
                                !isEditing ? "bg-gray-100" : "bg-white"
                              }`}
                            />
                      </div>

                      {/* Student Name */}
                      <div>
                        <label className="font-semibold">Student Name</label>
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
                          className={`w-full border rounded-xl p-3 ${
                            !isEditing ? "bg-gray-100" : "bg-white"
                          }`}
                        />
                      </div>

                      {/* Program */}
                      <div>
                        <label className="font-semibold">Program</label>

                        <select
                          disabled={!isEditing}
                          value={selectedCase.program}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              program: e.target.value,
                            })
                          }
                          className={`w-full border rounded-xl p-3 ${
                            !isEditing ? "bg-gray-100" : "bg-white"
                          }`}
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
                        <label className="font-semibold">Year Level</label>

                        <select
                          disabled={!isEditing}
                          value={selectedCase.yearLevel}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              yearLevel: e.target.value,
                            })
                          }
                          className={`w-full border rounded-xl p-3 ${
                            !isEditing ? "bg-gray-100" : "bg-white"
                          }`}
                        >
                          <option>1st Year</option>
                          <option>2nd Year</option>
                          <option>3rd Year</option>
                          <option>4th Year</option>
                        </select>
                      </div>

                      {/* Section */}
                      <div>
                        <label className="font-semibold">Section</label>

                        <input
                          value={selectedCase.section}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              section: e.target.value,
                            })
                          }
                          className={`w-full border rounded-xl p-3 ${
                            !isEditing ? "bg-gray-100" : "bg-white"
                          }`}
                        />
                      </div>

                      {/* Incident Date */}
                      <div>
                        <label className="font-semibold">Incident Date</label>

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
                          className={`w-full border rounded-xl p-3 ${
                            !isEditing ? "bg-gray-100" : "bg-white"
                          }`}
                        />
                      </div>

                      {/* Location */}
                      <div className="md:col-span-2">
                        <label className="font-semibold">Location</label>

                        <input
                          value={selectedCase.location}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              location: e.target.value,
                            })
                          }
                          className={`w-full border rounded-xl p-3 ${
                            !isEditing ? "bg-gray-100" : "bg-white"
                          }`}
                        />
                      </div>

                            {/* Contact */}
                          <div>
                            <label className="font-semibold">Contact Number</label>

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
                              className={`w-full border rounded-xl p-3 ${
                                !isEditing ? "bg-gray-100" : "bg-white"
                              }`}
                            />
                          </div>

                      {/* Status */}
                      <div>
                        <label className="font-semibold">Status</label>

                        <select
                          disabled={!isEditing}
                          value={selectedCase.status}
                          onChange={(e) =>
                            setSelectedCase({
                              ...selectedCase,
                              status: e.target.value,
                            })
                          }
                          className={`w-full border rounded-xl p-3 ${
                            !isEditing ? "bg-gray-100" : "bg-white"
                          }`}
                        >
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>

                    </div>

            {/* DESCRIPTION */}
              <div className="mt-6">
                <label className="font-semibold">Incident Type</label>

                <select
                  disabled={!isEditing}
                  value={selectedCase.incidentType}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      incidentType: e.target.value,
                    })
                  }
                  className={`w-full border rounded-xl p-3 mt-2 ${
                    !isEditing ? "bg-gray-100" : "bg-white"
                  }`}
                >
                  <option>Academic</option>
                  <option>Behavioral</option>
                  <option>Safety/Health</option>
                  <option>Property Damage</option>
                  <option>Other</option>
                </select>
              </div>


                <div className="mt-6">
                  <label className="font-semibold">
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
                    className={`w-full border rounded-xl p-3 h-28 mt-2 ${
                      !isEditing ? "bg-gray-100" : "bg-white"
                    }`}
                  />
                </div>

                    <div className="mt-5">
                      <label className="font-semibold">
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
                        className={`w-full border rounded-xl p-3 h-28 mt-2 ${
                          !isEditing ? "bg-gray-100" : "bg-white"
                        }`}
                      />
                    </div>

                    <div className="mt-5">
                      <label className="font-semibold">
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
                        className={`w-full border rounded-xl p-3 h-28 mt-2 ${
                          !isEditing ? "bg-gray-100" : "bg-white"
                        }`}
                      />
                    </div>

          </div>

        </div>
      )}
      
    </div>
  );
}