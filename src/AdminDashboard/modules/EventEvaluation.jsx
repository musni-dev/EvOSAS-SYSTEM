import AdminLayout from "../AdminLayout";

export default function EventEvaluation() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold mb-4">Event Evaluation</h1>

      <div className="bg-white p-4 rounded-xl shadow space-y-3">

        <button className="bg-[#ff6699] text-white px-4 py-2 rounded">
          Create Evaluation Form
        </button>

        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          View Responses
        </button>

        <button className="bg-green-500 text-white px-4 py-2 rounded">
          Export Reports
        </button>

      </div>
    </AdminLayout>
  );
}