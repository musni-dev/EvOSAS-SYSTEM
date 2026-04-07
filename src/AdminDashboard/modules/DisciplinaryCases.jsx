import AdminLayout from "../AdminLayout";

export default function DisciplinaryCases() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold mb-4">Disciplinary Cases</h1>

      <div className="bg-white p-4 rounded-xl shadow">
        <button className="bg-[#ff6699] text-white px-4 py-2 rounded">
          + Add Case
        </button>

        <p className="mt-4 text-gray-600">
          Manage student information, assign sanctions, and close cases.
        </p>
      </div>
    </AdminLayout>
  );
}