import AdminLayout from "../AdminLayout";

export default function OrgDocuments() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold mb-4">Student Org Documents</h1>

      <div className="bg-white p-4 rounded-xl shadow space-y-3">

        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          View Files
        </button>

        <button className="bg-green-500 text-white px-4 py-2 rounded">
          Download Document
        </button>

        <button className="bg-[#ff6699] text-white px-4 py-2 rounded">
          Verify Files
        </button>

      </div>
    </AdminLayout>
  );
}