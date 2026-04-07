import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 bg-[#0b2540] text-white p-5 space-y-4">

      <h1 className="text-xl font-bold text-[#ff6699]">
        EvOSAS Admin
      </h1>

      <nav className="flex flex-col gap-3 text-sm">

        <Link to="/admin/home" className="hover:text-[#ff6699]">Dashboard</Link>

        <Link to="/admin/cases">Disciplinary Cases</Link>
        <Link to="/admin/lostfound">Lost & Found</Link>
        <Link to="/admin/attendance">Attendance</Link>
        <Link to="/admin/evaluation">Event Evaluation</Link>
        <Link to="/admin/documents">Org Documents</Link>
        <Link to="/admin/users">User Management</Link>

      </nav>

    </div>
  );
}