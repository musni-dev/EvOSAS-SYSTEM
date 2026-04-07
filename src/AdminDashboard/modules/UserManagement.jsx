import AdminLayout from "../AdminLayout";

export default function UserManagement() {
  return (
    <AdminLayout>
      <h1 className="text-xl font-bold mb-4">User Management</h1>

      <div className="bg-white p-4 rounded-xl shadow space-y-3">

        <button className="bg-[#ff6699] text-white px-4 py-2 rounded">
          Create User
        </button>

        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Assign Roles
        </button>

        <button className="bg-green-500 text-white px-4 py-2 rounded">
          View Users
        </button>

        <button className="bg-red-500 text-white px-4 py-2 rounded">
          Deactivate Account
        </button>

      </div>
    </AdminLayout>
  );
}