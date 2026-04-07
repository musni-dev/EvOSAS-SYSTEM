import AdminLayout from "../AdminLayout";

export default function LostFoundAdmin() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold mb-4">Lost & Found</h1>

      <div className="bg-white p-4 rounded-xl shadow space-y-3">

        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Add Report
        </button>

        <button className="bg-green-500 text-white px-4 py-2 rounded">
          Approve / Decline
        </button>

        <button className="bg-gray-700 text-white px-4 py-2 rounded">
          Update Item Status
        </button>

      </div>
    </AdminLayout>
  );
}