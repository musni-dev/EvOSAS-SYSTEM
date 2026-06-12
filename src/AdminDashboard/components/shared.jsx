// ─── shared.jsx ──────────────────────────────────────────────────────────────
// Shared icons, UI primitives, and mock data for all EvOSAS pages

// ── Icon Library ──────────────────────────────────────────────────────────────
export const Icon = ({ name, size = 18 }) => {
  const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    discipline: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    lost: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    attendance: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>,
    events: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    orgs: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    menu: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    trend: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    package: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    filter: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  };
  return icons[name] || null;
};

// ── Reusable UI Primitives ────────────────────────────────────────────────────
export const Badge = ({ status }) => {
  const styles = {
    "Under Review":   "bg-amber-100 text-amber-800",
    "Resolved":       "bg-green-100 text-green-800",
    "Pending":        "bg-blue-100 text-blue-800",
    "Closed":         "bg-gray-200 text-gray-600",
    "Unclaimed":      "bg-pink-100 text-pink-800",
    "Claimed":        "bg-green-100 text-green-800",
    "Surrendered":    "bg-purple-100 text-purple-700",
    "Active":         "bg-green-100 text-green-800",
    "Inactive":       "bg-gray-200 text-gray-600",
    "Suspended":      "bg-red-100 text-red-700",
    "Upcoming":       "bg-blue-100 text-blue-800",
    "Completed":      "bg-green-100 text-green-800",
    "Cancelled":      "bg-red-100 text-red-600",
    "Approved":       "bg-green-100 text-green-800",
    "Pending Review": "bg-amber-100 text-amber-800",
    "Expired":        "bg-gray-200 text-gray-600",
    "High":           "bg-red-100 text-red-700",
    "Medium":         "bg-amber-100 text-amber-700",
    "Low":            "bg-green-100 text-green-700",
    "Admin":          "bg-pink-100 text-pink-800",
    "Moderator":      "bg-purple-100 text-purple-700",
    "Student":        "bg-blue-100 text-blue-700",
    "Staff":          "bg-indigo-100 text-indigo-700",
    "Present":        "bg-green-100 text-green-700",
    "Absent":         "bg-red-100 text-red-700",
    "Late":           "bg-amber-100 text-amber-700",
    "Excused":        "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
};

export const SectionHeader = ({ title, subtitle, action, onAction }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && (
      <button
        onClick={onAction}
        className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm shadow-pink-200"
      >
        <Icon name="plus" size={16} />
        {action}
      </button>
    )}
  </div>
);

export const StatMini = ({ label, value, color = "text-gray-900" }) => (
  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
  </div>
);

export const TableWrap = ({ children }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-100">
    <table className="w-full text-sm">{children}</table>
  </div>
);

export const Th = ({ children }) => (
  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">{children}</th>
);

export const Td = ({ children, className = "" }) => (
  <td className={`px-4 py-3 text-gray-700 border-t border-gray-50 ${className}`}>{children}</td>
);

export const ActionBtns = ({ onEdit, onDelete }) => (
  <div className="flex gap-2">
    <button onClick={onEdit} className="text-gray-400 hover:text-pink-500 transition-colors"><Icon name="edit" size={15} /></button>
    <button onClick={onDelete} className="text-gray-400 hover:text-red-400 transition-colors"><Icon name="trash" size={15} /></button>
  </div>
);

// ── Modal Wrapper ─────────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><Icon name="x" size={20} /></button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

export const FormField = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
  </div>
);

export const Input = ({ ...props }) => (
  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition" {...props} />
);

export const Select = ({ children, ...props }) => (
  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition bg-white" {...props}>
    {children}
  </select>
);

export const SubmitBtn = ({ children = "Save", onClick }) => (
  <button onClick={onClick} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2.5 rounded-xl transition-colors mt-2 shadow-sm shadow-pink-200">
    {children}
  </button>
);

// ── Mock Data ─────────────────────────────────────────────────────────────────
export const mockDisciplinary = [
  { id: "DC-001", student: "Juan dela Cruz", studentId: "2021-00123", case: "Academic Dishonesty", status: "Under Review", date: "2025-04-28", severity: "High", officer: "Dr. Reyes" },
  { id: "DC-002", student: "Maria Santos", studentId: "2022-00456", case: "Violation of Dress Code", status: "Resolved", date: "2025-04-25", severity: "Low", officer: "Ms. Garcia" },
  { id: "DC-003", student: "Carlo Reyes", studentId: "2023-00789", case: "Unauthorized Absence", status: "Pending", date: "2025-04-22", severity: "Medium", officer: "Mr. Lopez" },
  { id: "DC-004", student: "Ana Bautista", studentId: "2021-00234", case: "Misconduct in Campus", status: "Under Review", date: "2025-04-20", severity: "High", officer: "Dr. Reyes" },
  { id: "DC-005", student: "Jose Ramos", studentId: "2022-00567", case: "Property Damage", status: "Closed", date: "2025-04-15", severity: "Medium", officer: "Ms. Garcia" },
  { id: "DC-006", student: "Liza Mendoza", studentId: "2023-00890", case: "Bullying", status: "Pending", date: "2025-04-10", severity: "High", officer: "Dr. Reyes" },
];

export const mockLostFound = [
  { id: "LF-001", item: "Black Laptop Bag", location: "Library 2F", status: "Unclaimed", date: "2025-04-30", reporter: "Security Guard", description: "Black backpack with laptop inside" },
  { id: "LF-002", item: "Student ID - Maria C.", location: "Cafeteria", status: "Claimed", date: "2025-04-29", reporter: "Cafeteria Staff", description: "Student ID card" },
  { id: "LF-003", item: "Scientific Calculator", location: "Room 301", status: "Unclaimed", date: "2025-04-27", reporter: "Prof. Mendoza", description: "Casio fx-991ES Plus" },
  { id: "LF-004", item: "Blue Umbrella", location: "Main Lobby", status: "Unclaimed", date: "2025-04-26", reporter: "Security Guard", description: "Foldable blue umbrella" },
  { id: "LF-005", item: "Eyeglasses", location: "Gym", status: "Claimed", date: "2025-04-24", reporter: "Student", description: "Thin metal frame eyeglasses" },
  { id: "LF-006", item: "Water Bottle", location: "Room 215", status: "Surrendered", date: "2025-04-23", reporter: "Prof. Santos", description: "Stainless steel bottle" },
];

export const mockAttendance = [
  { date: "2025-04-30", present: 3412, absent: 430, late: 112, excused: 88, rate: "88.8%" },
  { date: "2025-04-29", present: 3520, absent: 322, late: 98, excused: 102, rate: "91.6%" },
  { date: "2025-04-28", present: 3389, absent: 453, late: 130, excused: 70, rate: "88.2%" },
  { date: "2025-04-27", present: 3601, absent: 241, late: 88, excused: 112, rate: "93.7%" },
  { date: "2025-04-26", present: 3488, absent: 354, late: 105, excused: 95, rate: "90.8%" },
  { date: "2025-04-25", present: 3310, absent: 532, late: 145, excused: 55, rate: "86.1%" },
];

export const mockEvents = [
  { id: "EV-001", name: "Leadership Summit 2025", org: "SSC", date: "2025-05-15", status: "Upcoming", rating: null, attendance: 0, venue: "Auditorium", budget: 45000 },
  { id: "EV-002", name: "Science Fair", org: "Science Club", date: "2025-04-20", status: "Completed", rating: 4.7, attendance: 892, venue: "Gymnasium", budget: 28000 },
  { id: "EV-003", name: "Cultural Night", org: "Cultural Org", date: "2025-04-10", status: "Completed", rating: 4.9, attendance: 1200, venue: "Auditorium", budget: 60000 },
  { id: "EV-004", name: "Tech Symposium", org: "IT Society", date: "2025-05-22", status: "Upcoming", rating: null, attendance: 0, venue: "Room 401", budget: 15000 },
  { id: "EV-005", name: "Tree Planting", org: "Environment Club", date: "2025-05-08", status: "Upcoming", rating: null, attendance: 0, venue: "Campus Grounds", budget: 8000 },
  { id: "EV-006", name: "Sports Fest", org: "SSC", date: "2025-03-20", status: "Completed", rating: 4.5, attendance: 2100, venue: "Sports Complex", budget: 120000 },
];

export const mockOrganizations = [
  { id: "ORG-001", name: "Supreme Student Council", acronym: "SSC", members: 48, bylaw: "Approved", status: "Active", accredited: "2024-08-10", adviser: "Dr. Santos", color: "from-pink-400 to-pink-600" },
  { id: "ORG-002", name: "IT Society", acronym: "ITS", members: 120, bylaw: "Approved", status: "Active", accredited: "2024-08-15", adviser: "Prof. Cruz", color: "from-blue-400 to-blue-600" },
  { id: "ORG-003", name: "Cultural Organization", acronym: "CultOrg", members: 85, bylaw: "Pending Review", status: "Active", accredited: "2024-09-01", adviser: "Ms. Reyes", color: "from-purple-400 to-purple-600" },
  { id: "ORG-004", name: "Environment Club", acronym: "EnvClub", members: 67, bylaw: "Approved", status: "Active", accredited: "2024-08-20", adviser: "Prof. Lim", color: "from-green-400 to-green-600" },
  { id: "ORG-005", name: "Science Club", acronym: "SciClub", members: 93, bylaw: "Approved", status: "Inactive", accredited: "2023-08-12", adviser: "Dr. Tan", color: "from-amber-400 to-amber-600" },
];

export const mockUsers = [
  { id: "USR-001", name: "Dr. Ramon Reyes", email: "r.reyes@evosas.edu", role: "Admin", status: "Active", department: "OSA", lastLogin: "2025-04-30 09:12" },
  { id: "USR-002", name: "Ms. Ana Garcia", email: "a.garcia@evosas.edu", role: "Moderator", status: "Active", department: "Registrar", lastLogin: "2025-04-30 08:45" },
  { id: "USR-003", name: "Prof. Ben Cruz", email: "b.cruz@evosas.edu", role: "Staff", status: "Active", department: "IT Dept", lastLogin: "2025-04-29 14:30" },
  { id: "USR-004", name: "Mr. Jose Lopez", email: "j.lopez@evosas.edu", role: "Moderator", status: "Suspended", department: "Security", lastLogin: "2025-04-20 11:00" },
  { id: "USR-005", name: "Ms. Clara Santos", email: "c.santos@evosas.edu", role: "Staff", status: "Active", department: "Library", lastLogin: "2025-04-30 07:55" },
  { id: "USR-006", name: "Juan dela Cruz", email: "jdc2021@student.edu", role: "Student", status: "Active", department: "BSIT 3-A", lastLogin: "2025-04-29 10:20" },
];

export const recentActivity = [
  { type: "discipline", text: "New disciplinary case filed for Juan dela Cruz", time: "2 hours ago", icon: "alert" },
  { type: "lost", text: "Lost item reported: Scientific Calculator in Room 301", time: "4 hours ago", icon: "package" },
  { type: "attendance", text: "Attendance log updated for April 30, 2025", time: "6 hours ago", icon: "check" },
  { type: "event", text: "Event evaluation submitted: Science Fair rated 4.7★", time: "1 day ago", icon: "events" },
  { type: "org", text: "IT Society bylaws approved and filed", time: "2 days ago", icon: "orgs" },
];