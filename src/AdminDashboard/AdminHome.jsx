import AdminLayout from "./AdminLayout";

export default function AdminHome() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6 text-[#ff6699]">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-3 gap-4">

        <div className="bg-white p-5 rounded-xl shadow">
          Disciplinary Cases
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          Lost & Found Reports
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          Attendance Sessions
        </div>

      </div>
    </AdminLayout>
  );
}