export default function CaseRecords({ cases , setActivePage}) {
  return (
    <div className="bg-white rounded-3xl shadow-md p-6 overflow-x-auto">

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
          placeholder="Search..."
          className="border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6699]"
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
            cases.map((item, index) => (
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

                <td className="p-4 flex gap-2">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">
                    Edit
                  </button>

                  <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm">
                    Close
                  </button>
                </td>

              </tr>
            ))
          )}

        </tbody>
      </table>

    </div>
  );
}