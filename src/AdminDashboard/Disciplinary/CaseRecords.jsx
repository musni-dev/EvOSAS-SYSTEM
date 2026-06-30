import { useState } from "react";
import { collection, query,  doc, deleteDoc, updateDoc, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { FaEye, FaTrash, FaEdit } from "react-icons/fa";


export default function CaseRecords({   
  cases,
  setActivePage,
  }) 
  
  
  {
  const [selectedCase, setSelectedCase] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleView = (item) => {
  setSelectedCase(item);
  setIsEditing(false);
  setShowViewModal(true);
};
  

const handleEdit = (item) => {
  setSelectedCase(item);
  setShowEditModal(true);
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



const filteredCases = cases.filter((item) => {
  const term = searchTerm.toLowerCase();

  return (
    item.name?.toLowerCase().includes(term) ||
    item.studentId?.toLowerCase().includes(term)
  );
});

  return (
    <div className="bg-white rounded-3xl shadow-md p-6 overflow-x-auto">
      <div className="min-w-[900px]">

{/* TABLE */}
<div className="bg-white rounded-3xl shadow-md p-4 sm:p-6 overflow-x-auto">
  <div className="min-w-[1100px]">

    {/* HEADER */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <h2 className="text-xl font-bold text-gray-700">
        Case Records
      </h2>

      <input
        type="text"
        placeholder="Search by Last Name or Student ID..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full sm:w-96 rounded-xl px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
      />
    </div>

    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-gray-100 text-gray-700">
          <th className="p-4 rounded-l-xl">Case Number</th>
          <th className="p-4">Student ID</th>
          <th className="p-4">Name</th>
          <th className="p-4">Program</th>
          <th className="p-4">Year & Section</th>
          <th className="p-4">Incident Type</th>
          <th className="p-4">Contact</th>
          <th className="p-4">Status</th>
          <th className="p-4">Offense Level</th>
          <th className="p-4 rounded-r-xl text-center">Actions</th>
        </tr>
      </thead>

      <tbody>
        {cases.length === 0 ? (
          <tr>
            <td
              colSpan="10"
              className="text-center p-6 text-gray-400"
            >
              No disciplinary records yet.
            </td>
          </tr>
        ) : (
          [...filteredCases].reverse().map((item) => (
            <tr
              key={item.id}
              className="border-b hover:bg-pink-50 transition cursor-pointer"
              onClick={() => handleView(item)}
            >
              <td className="p-4 font-semibold text-pink-500">
                {item.caseNumber}
              </td>

              <td className="p-4">{item.studentId}</td>

              <td className="p-4">{item.name}</td>

              <td className="p-4">{item.program}</td>

              <td className="p-4">
                {item.yearLevel} - {item.section}
              </td>

              <td className="p-4">
                {item.incidentType === "Other"
                  ? item.otherIncident
                  : item.incidentType}
              </td>

              <td className="p-4">
                {item.contactNumber || "N/A"}
              </td>

              <td className="p-4">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                  {item.status}
                </span>
              </td>

              <td className="p-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    getOffenseLevel(item) === "WARNING"
                      ? "bg-gray-200 text-gray-700"
                      : getOffenseLevel(item) === "1ST OFFENSE"
                      ? "bg-yellow-100 text-yellow-700"
                      : getOffenseLevel(item) === "2ND OFFENSE"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {getOffenseLevel(item)}
                </span>
              </td>

              <td className="p-4">
                <div className="flex items-center justify-center gap-2">

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(item);
                    }}
                    className="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white transition shadow-sm"
                    title="View"
                  >
                    <FaEye />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition shadow-sm"
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
      

    </div> {/* close min-w wrapper */}
</div>
  );
}