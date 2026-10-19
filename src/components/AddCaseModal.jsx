import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function AddCaseModal({ show, onClose, cases, setCases }) {
  const [student, setStudent] = useState({
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

  const [caseNumber, setCaseNumber] = useState("");

  // AUTO CASE NUMBER (same logic mo)
  useEffect(() => {
    const maxNumber = cases?.length
      ? Math.max(
          ...cases.map((c) =>
            parseInt(c.caseNumber?.replace("CASE-", "") || "0", 10)
          )
        )
      : 0;

    const next = maxNumber + 1;
    setCaseNumber(`CASE-${String(next).padStart(7, "0")}`);
  }, [cases]);

  const handleChange = (e) => {
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const newCase = {
      ...student,
      caseNumber,
      status: "in-progress",
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "cases"), newCase);

    setCases([...cases, { ...newCase, id: docRef.id }]);

    alert("Case Saved!");
    onClose();

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
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 overflow-y-auto max-h-[95vh]">

       {/* HEADER */}
            <div className="flex justify-between items-center mb-6">

              <div>
                <h2 className="text-3xl font-bold text-[#ff6699]">
                  Add Disciplinary Case
                </h2>

                <p className="text-gray-500 text-sm">
                  Create and manage disciplinary records.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="text-3xl text-gray-400 hover:text-red-500 transition"
              >
                ✕
              </button>
            </div>

            {/* CASE DETAILS */}
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 mb-6">

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

              <h3 className="text-xl font-bold text-gray-800 mb-5">
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
                    value={student.name}
                    onChange={handleChange}
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
                value={student.decision}
                onChange={handleChange}
                placeholder="Enter recommendations or follow-up actions..."
                className="w-full border rounded-2xl p-4 h-28 focus:ring-2 focus:ring-[#ff6699] outline-none"
              />

            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-4">

              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 transition font-semibold"
              >
                Cancel
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
  );
}