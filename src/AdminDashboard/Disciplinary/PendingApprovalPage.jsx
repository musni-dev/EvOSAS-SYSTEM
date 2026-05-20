export default function PendingApprovalPage({ cases, setActivePage }) {
  return (
    <div className="bg-white rounded-3xl shadow-md p-6">

      <div className="flex items-center justify-between mb-5">

        <h2 className="text-2xl font-bold text-gray-700">
          Pending Approval Cases
        </h2>

        <button
          onClick={() => setActivePage("main")}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-medium"
        >
          ← Back
        </button>

      </div>

      {cases.filter((item) => item.status === "in-progress").length === 0 ? (
        <p className="text-gray-400">
          No pending cases.
        </p>
      ) : (
        <div className="space-y-4">

          {cases
            .filter((item) => item.status === "in-progress")
            .map((item, index) => (
              <div
                key={index}
                className="border rounded-2xl p-5 hover:bg-pink-50 transition"
              >

                <div className="flex justify-between items-center">

                  <div>
                    <h3 className="font-bold text-lg text-[#ff6699]">
                      {item.caseNumber}
                    </h3>

                    <p className="text-gray-700">
                      {item.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {item.program}
                    </p>
                  </div>

                  <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-semibold">
                    {item.status}
                  </span>

                </div>

              </div>
            ))}

        </div>
      )}
    </div>
  );
}