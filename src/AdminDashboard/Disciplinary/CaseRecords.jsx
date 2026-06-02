import { useState } from "react";
import {
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";

import { db } from "../../firebase/firebase";


export default function CaseRecords({   
  cases,
  setActivePage,
  }) 
  
  
  {
  const [selectedCase, setSelectedCase] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

const handleView = (item) => {
  setSelectedCase(item);
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

      await updateDoc(doc(db, "cases", selectedCase.id), {
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

    setShowEditModal(false);

    window.location.reload();
  } catch (error) {
    console.error(error);
    alert("Failed to update case.");
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

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-700">
          Case Records
        </h2>

      

           <button
          onClick={() => setActivePage("main")}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-medium"
        >
          ← Back
        </button>
        
      </div>
        <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-700">
         
        </h2>
          <input
            type="text"
            placeholder="Search by Last Name or Student ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-300 border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6699]"
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
            <th className="p-4 rounded-r-xl">Actions</th>

          </tr>
        </thead>

        <tbody>

          {cases.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center p-6 text-gray-400">
                No disciplinary records yet.
              </td>
            </tr>
          ) : (
            filteredCases.map((item, index) => (
              <tr
                key={index}
                className="border-b hover:bg-pink-50 transition"
              >

                <td className="p-4 font-semibold text-[#ff6699]">
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
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                    {item.status}
                  </span>
                </td>

                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium
                    ${
                      getOffenseLevel(item) === "WARNING"
                        ? "bg-gray-200 text-gray-700"
                        : getOffenseLevel(item) === "1ST OFFENSE"
                        ? "bg-yellow-100 text-yellow-700"
                        : getOffenseLevel(item) === "2ND OFFENSE"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                    }
                  `}>
                    {getOffenseLevel(item)}
                  </span>
                </td>

                  <td className="p-4 flex gap-2">

                  <button
                    onClick={() => handleEdit(item)}
                       className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleView(item)}
                     className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    View
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Delete
                  </button>

                </td>

              </tr>
            ))
          )}

        </tbody>
      </table>

     {showViewModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-bold text-[#ff6699]">
                Case Details
              </h2>

              <button
                onClick={() => setShowViewModal(false)}
                className="text-2xl"
              >
                ✕
              </button>
            </div>

            {/* GRID INFO */}
            <div className="grid md:grid-cols-2 gap-4 text-sm">

              <div><strong>Case Number:</strong><p>{selectedCase.caseNumber}</p></div>
              <div><strong>Student ID:</strong><p>{selectedCase.studentId}</p></div>
              <div><strong>Name:</strong><p>{selectedCase.name}</p></div>
              <div><strong>Program:</strong><p>{selectedCase.program}</p></div>
              <div><strong>Year Level:</strong><p>{selectedCase.yearLevel}</p></div>
              <div><strong>Section:</strong><p>{selectedCase.section}</p></div>
              <div><strong>Incident Date:</strong><p>{selectedCase.incidentDate}</p></div>
              <div><strong>Location:</strong><p>{selectedCase.location}</p></div>
              <div><strong>Contact Number:</strong><p>{selectedCase.contactNumber || "N/A"}</p></div>
              <div><strong>Status:</strong><p>{selectedCase.status}</p></div>
              <div><strong>Incident Type:</strong><p>{selectedCase.incidentType}</p></div>

            </div>

            {/* DESCRIPTION */}
            <div className="mt-6">
              <strong>Incident Description:</strong>
              <p className="mt-2 bg-gray-50 p-3 rounded-xl">
                {selectedCase.offense}
              </p>
            </div>

            <div className="mt-4">
              <strong>Immediate Actions:</strong>
              <p className="mt-2 bg-gray-50 p-3 rounded-xl">
                {selectedCase.sanctions}
              </p>
            </div>

            <div className="mt-4">
              <strong>Recommendations:</strong>
              <p className="mt-2 bg-gray-50 p-3 rounded-xl">
                {selectedCase.decision}
              </p>
            </div>

          </div>

        </div>
      )}

        {showEditModal && selectedCase && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">

            <div className="bg-white rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">

              <h2 className="text-2xl font-bold text-[#ff6699] mb-6">
                Edit Disciplinary Case
              </h2>

              <div className="grid md:grid-cols-2 gap-4">

                <input
                  type="text"
                  value={selectedCase.studentId}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      studentId: e.target.value,
                    })
                  }
                  placeholder="Student ID"
                  className="border p-3 rounded-xl"
                />

                <input
                  type="text"
                  value={selectedCase.name}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      name: e.target.value,
                    })
                  }
                  placeholder="Student Name"
                  className="border p-3 rounded-xl"
                />

                <input
                  type="text"
                  value={selectedCase.program}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      program: e.target.value,
                    })
                  }
                  placeholder="Program"
                  className="border p-3 rounded-xl"
                />

                <input
                  type="text"
                  value={selectedCase.yearLevel}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      yearLevel: e.target.value,
                    })
                  }
                  placeholder="Year Level"
                  className="border p-3 rounded-xl"
                />

                <input
                  type="text"
                  value={selectedCase.section}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      section: e.target.value,
                    })
                  }
                  placeholder="Section"
                  className="border p-3 rounded-xl"
                />

                <input
                  type="date"
                  value={selectedCase.incidentDate}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      incidentDate: e.target.value,
                    })
                  }
                  className="border p-3 rounded-xl"
                />

                <input
                  type="text"
                  value={selectedCase.location}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      location: e.target.value,
                    })
                  }
                  placeholder="Location"
                  className="border p-3 rounded-xl md:col-span-2"
                />

                <input
                  type="text"
                  value={selectedCase.contactNumber}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      contactNumber: e.target.value,
                    })
                  }
                  placeholder="Contact Number"
                  className="border p-3 rounded-xl"
                />

                <input
                  type="text"
                  value={selectedCase.incidentType}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      incidentType: e.target.value,
                    })
                  }
                  placeholder="Incident Type"
                  className="border p-3 rounded-xl"
                />

              </div>

              <div className="mt-5">

                <label className="font-semibold">
                  Incident Description
                </label>

                <textarea
                  value={selectedCase.offense}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      offense: e.target.value,
                    })
                  }
                  className="w-full border p-3 rounded-xl h-28 mt-2"
                />

              </div>

              <div className="mt-5">

                <label className="font-semibold">
                  Immediate Actions Taken
                </label>

                <textarea
                  value={selectedCase.sanctions}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      sanctions: e.target.value,
                    })
                  }
                  className="w-full border p-3 rounded-xl h-28 mt-2"
                />

              </div>

              <div className="mt-5">

                <label className="font-semibold">
                  Recommendations
                </label>

                <textarea
                  value={selectedCase.decision}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      decision: e.target.value,
                    })
                  }
                  className="w-full border p-3 rounded-xl h-28 mt-2"
                />

              </div>

              <div className="mt-5">

                <label className="font-semibold">
                  Status
                </label>

                <select
                  value={selectedCase.status}
                  onChange={(e) =>
                    setSelectedCase({
                      ...selectedCase,
                      status: e.target.value,
                    })
                  }
                  className="w-full border p-3 rounded-xl mt-2"
                >
                  <option value="in-progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  

                </select>

              </div>

              <div className="flex justify-end gap-3 mt-6">

                <button
                  onClick={() => setShowEditModal(false)}
                  className="bg-red-700 text-white px-5 py-2 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  onClick={handleUpdate}
                  className="bg-[#f32469] text-white px-5 py-2 rounded-xl"
                >
                  Save Changes
                </button>

              </div>

            </div>

          </div>
        )}

    </div> {/* close min-w wrapper */}
</div>
  );
}