import AdminLayout from "../AdminLayout";

export default function Attendance() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold mb-4">Attendance Management</h1>

      <div className="bg-white p-4 rounded-xl shadow space-y-3">

        <button className="bg-[#ff6699] text-white px-4 py-2 rounded">
          Create Session
        </button>

        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Generate QR Code
        </button>

        <button className="bg-green-500 text-white px-4 py-2 rounded">
          View Records
        </button>

        <button className="bg-gray-700 text-white px-4 py-2 rounded">
          Export Report
        </button>

      </div>
    </AdminLayout>
  );
}