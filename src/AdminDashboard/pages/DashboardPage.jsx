import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,} from "recharts";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query,  orderBy,  limit, getDocs, } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function DashboardPage({ darkMode }) {

const [stats, setStats] = useState({ totalCases: 0, lost: 0, found: 0, users: 0, todayCases: 0,   lostThisWeek: 0, foundThisWeek: 0, usersThisMonth: 0,});

const [dailyReports, setDailyReports] = useState([]);
const [pieData, setPieData] = useState([]);
const [recentReports, setRecentReports] = useState([]);
const [activities, setActivities] = useState([]);


useEffect(() => {
  const unsub = onSnapshot(
    collection(db, "lost_found"),
    (snapshot) => {

      const days = {
        Sun: 0,
        Mon: 0,
        Tue: 0,
        Wed: 0,
        Thu: 0,
        Fri: 0,
        Sat: 0,
      };

      snapshot.docs.forEach((doc) => {
        const data = doc.data();

        if (!data.createdAt) return;

        const date = data.createdAt.toDate();

        const day = date.toLocaleDateString("en-US", {
          weekday: "short",
        });

        days[day]++;
      });

      setDailyReports(
        Object.entries(days).map(([day, reports]) => ({
          day,
          reports,
        }))
      );
    }
  );

  return () => unsub();
}, []);

useEffect(() => {
const unsubCases = onSnapshot(
  collection(db, "cases"),
  (snapshot) => {
    const today = new Date().toDateString();

    const todayCount = snapshot.docs.filter((doc) => {
      const data = doc.data();
      if (!data.createdAt) return false;

      return (
        data.createdAt.toDate().toDateString() === today
      );
    }).length;

    setStats((prev) => ({
      ...prev,
      totalCases: snapshot.size,
      todayCases: todayCount,
    }));
  }
);

const unsubLostFound = onSnapshot(
  collection(db, "lost_found"),
  (snapshot) => {
    const reports = snapshot.docs.map((doc) => doc.data());

    const now = new Date();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const lost = reports.filter(
      (item) => item.reportType === "Lost"
    ).length;

    const found = reports.filter(
      (item) => item.reportType === "Found"
    ).length;

    const lostThisWeek = reports.filter((item) => {
      if (item.reportType !== "Lost" || !item.createdAt) return false;

      return item.createdAt.toDate() >= oneWeekAgo;
    }).length;

    const foundThisWeek = reports.filter((item) => {
      if (item.reportType !== "Found" || !item.createdAt) return false;

      return item.createdAt.toDate() >= oneWeekAgo;
    }).length;

    setStats((prev) => ({
      ...prev,
      lost,
      found,
      lostThisWeek,
      foundThisWeek,
    }));
  }
);

const unsubUsers = onSnapshot(
  collection(db, "users"),
  (snapshot) => {
    const now = new Date();

    const usersThisMonth = snapshot.docs.filter((doc) => {
      const data = doc.data();

      if (!data.createdAt) return false;

      const created = data.createdAt.toDate();

      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length;

    setStats((prev) => ({
      ...prev,
      users: snapshot.size,
      usersThisMonth,
    }));
  }
);

  return () => {
    unsubCases();
    unsubLostFound();
    unsubUsers();
  };
}, []);



useEffect(() => {
  const unsubUsers = onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const users = snapshot.docs.map((doc) => doc.data());

      const total = users.length;

      const active = users.filter(
        (user) => user.status === "Active"
      ).length;

      const inactive = users.filter(
        (user) => user.status === "Inactive"
      ).length;

      setPieData([
        {
          name: "Total Users",
          value: total,
        },
        {
          name: "Active",
          value: active,
        },
        {
          name: "Inactive",
          value: inactive,
        },
      ]);
    }
  );

  return () => unsubUsers();
}, []);

const COLORS = [
  "#ec4899", // total
  "#22c55e", // active
  "#ef4444", // inactive
];

useEffect(() => {
  const fetchRecentData = async () => {
    try {
      // Lost & Found
      const lostSnap = await getDocs(
        query(
          collection(db, "lost_found"),
          orderBy("createdAt", "desc"),
          limit(5)
        )
      );

      const lostData = lostSnap.docs.map((doc) => ({
        id: doc.id,
        reportType: doc.data().reportType,
        itemname: doc.data().itemName,
        status: doc.data().status,
        date: doc.data().createdAt?.toDate()?.toLocaleDateString(),
      }));

      setRecentReports(lostData);

      // Activity
      const caseSnap = await getDocs(
        query(
          collection(db, "cases"),
          orderBy("createdAt", "desc"),
          limit(5)
        )
      );

      const activityData = caseSnap.docs.map((doc) => ({
        title: `New Case Added`,
        time: doc.data().createdAt
          ?.toDate()
          ?.toLocaleString(),
      }));

      setRecentActivities(activityData);

    } catch (err) {
      console.error(err);
    }
  };

  fetchRecentData();
}, []);

useEffect(() => {
  const fetchActivities = async () => {
    try {
      const activityList = [];

      // CASES
      const casesSnap = await getDocs(
        query(
          collection(db, "cases"),
          orderBy("createdAt", "desc"),
          limit(5)
        )
      );

      casesSnap.forEach((doc) => {
        activityList.push({
          title: "New Disciplinary Case Added",
          time: doc.data().createdAt?.toDate(),
        });
      });

      // LOST & FOUND
      const lostSnap = await getDocs(
        query(
          collection(db, "lost_found"),
          orderBy("createdAt", "desc"),
          limit(5)
        )
      );

      lostSnap.forEach((doc) => {
        activityList.push({
          title: `${doc.data().reportType} Item Submitted`,
          time: doc.data().createdAt?.toDate(),
        });
      });

      // USERS
      const userSnap = await getDocs(
        query(
          collection(db, "users"),
          orderBy("createdAt", "desc"),
          limit(5)
        )
      );

      userSnap.forEach((doc) => {
        activityList.push({
          title: "New User Created",
          time: doc.data().createdAt?.toDate(),
        });
      });

      // sort latest first
      activityList.sort((a, b) => b.time - a.time);

      setActivities(activityList.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  fetchActivities();
}, []);



function timeAgo(date) {
  if (!date) return "Unknown";

  const seconds = Math.floor((new Date() - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const key in intervals) {
    const value = Math.floor(seconds / intervals[key]);

    if (value > 0) {
      return `${value} ${key}${value > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
}
 

  return (
    <div
        className={`flex-1 overflow-auto p-5 sm:p-8 transition-colors duration-300 ${
          darkMode
            ? "bg-[#0b1120] text-white"
            : "bg-slate-50 text-gray-900"
        }`}
      >
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
            EVOSAS Dashboard
          </h1>

          <p className={`mt-2 text-sm sm:text-base ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Monitor reports, attendance, events and analytics.
          </p>
        </div>

        <div className={`px-5 py-2.5 rounded-2xl shadow-sm border transition-all duration-200 ${
          darkMode
            ? "bg-gray-900/60 border-gray-800 backdrop-blur"
            : "bg-white border-pink-100"
        }`}>
          <span className="text-pink-600 font-semibold text-sm tracking-wide">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-pink-600 to-rose-500 text-white rounded-3xl p-6 shadow-lg shadow-pink-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-0.5">
          <p className="text-sm font-medium opacity-90 tracking-wide">Case Reports</p>
          <h2 className="text-4xl sm:text-5xl font-bold mt-3">{stats.totalCases}</h2>
              <p className="mt-2 text-sm opacity-90">
              {stats.todayCases
                ? `+${stats.todayCases} Today`
                : "No updates today"}
            </p>
        </div>

        <div
          className={`rounded-3xl p-6 border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
            darkMode
              ? "bg-gray-900/60 border-gray-800 text-white"
              : "bg-white border-gray-100"
          }`}
        >
          <p className={`text-sm font-medium tracking-wide ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Lost Items</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-pink-600 mt-3">{stats.lost}</h2>
          <p className="text-emerald-500 text-sm mt-2 font-medium">
            {stats.lostThisWeek > 0
              ? `+${stats.lostThisWeek} this week`
              : "No reports this week"}
          </p>
        </div>

        <div
          className={`rounded-3xl p-6 border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
            darkMode
              ? "bg-gray-900/60 border-gray-800 text-white"
              : "bg-white border-gray-100"
          }`}
        >
          <p className={`text-sm font-medium tracking-wide ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Found Items</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-pink-600 mt-3">{stats.found}</h2>
          <p className="text-emerald-500 text-sm mt-2 font-medium">
           {stats.foundThisWeek > 0
            ? `+${stats.foundThisWeek} this week`
            : "No reports this week"}
          </p>
        </div>

        <div
          className={`rounded-3xl p-6 border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
            darkMode
              ? "bg-gray-900/60 border-gray-800 text-white"
              : "bg-white border-gray-100"
          }`}
        >
          <p className={`text-sm font-medium tracking-wide ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Users</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-pink-600 mt-3">{stats.users}</h2>
          <p className="text-emerald-500 text-sm mt-2 font-medium">
            {stats.usersThisMonth > 0
              ? `+${stats.usersThisMonth} this month`
              : "No new users this month"}
          </p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* BAR CHART */}
        <div
          className={`xl:col-span-2 rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md ${
            darkMode
              ? "bg-gray-900/60 border-gray-800 text-white"
              : "bg-white border-gray-100"
          }`}
        >
          <h2 className="text-lg font-bold text-pink-600 mb-1">
            Report Items Per Day
          </h2>
          <p className={`text-xs mb-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
            Weekly distribution of lost &amp; found submissions
          </p>

          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dailyReports}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1f2937" : "#f1f5f9"} />
              <XAxis dataKey="day" stroke={darkMode ? "#9ca3af" : "#6b7280"} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={darkMode ? "#9ca3af" : "#6b7280"} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  background: darkMode ? "#111827" : "#ffffff",
                  color: darkMode ? "#fff" : "#111827",
                }}
                cursor={{ fill: darkMode ? "rgba(236,72,153,0.06)" : "rgba(236,72,153,0.06)" }}
              />

              <Bar
                dataKey="reports"
                fill="#ec4899"
                radius={[10, 10, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART */}
                <div
                  className={`rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md ${
                    darkMode
                      ? "bg-gray-900/60 border-gray-800 text-white"
                      : "bg-white border-gray-100"
                  }`}
                >
                <h2 className="text-lg font-bold text-pink-600 mb-1">
                    User Distribution
                </h2>
                <p className={`text-xs mb-4 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                    Breakdown by account status
                </p>

                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        innerRadius={60}
                        paddingAngle={3}
                        label
                    >
                        {pieData.map((entry, index) => (
                        <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                            stroke={darkMode ? "#111827" : "#ffffff"}
                            strokeWidth={2}
                        />
                        ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        background: darkMode ? "#111827" : "#ffffff",
                        color: darkMode ? "#fff" : "#111827",
                      }}
                    />
                    </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium">
                    <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div>
                    <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Total Users</span>
                    </div>

                    <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Active</span>
                    </div>

                    <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Inactive</span>
                    </div>
                </div>
                </div>
      </div>

      {/* TABLE + ACTIVITY */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* TABLE */}
        <div
          className={`xl:col-span-2 rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md ${
            darkMode
              ? "bg-gray-900/60 border-gray-800 text-white"
              : "bg-white border-gray-100"
          }`}
        >
          <h2 className="text-lg font-bold text-pink-600 mb-5">
            Recent Reports Lost and Found
          </h2>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={`text-left py-3 px-2 font-semibold text-xs uppercase tracking-wider sticky top-0 ${darkMode ? "text-gray-400 bg-gray-900/60" : "text-gray-500 bg-white"}`}>
                    Report ID
                  </th>

                  <th className={`text-left py-3 px-2 font-semibold text-xs uppercase tracking-wider sticky top-0 ${darkMode ? "text-gray-400 bg-gray-900/60" : "text-gray-500 bg-white"}`}>
                    Lost/Found
                  </th>

                  <th className={`text-left py-3 px-2 font-semibold text-xs uppercase tracking-wider sticky top-0 ${darkMode ? "text-gray-400 bg-gray-900/60" : "text-gray-500 bg-white"}`}>
                    Item Name
                  </th>

                  
                   <th className={`text-left py-3 px-2 font-semibold text-xs uppercase tracking-wider sticky top-0 ${darkMode ? "text-gray-400 bg-gray-900/60" : "text-gray-500 bg-white"}`}>
                    Status
                  </th>

                  <th className={`text-left py-3 px-2 font-semibold text-xs uppercase tracking-wider sticky top-0 ${darkMode ? "text-gray-400 bg-gray-900/60" : "text-gray-500 bg-white"}`}>
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                    {recentReports.length > 0 ? (
                        recentReports.map((report, idx) => (
                              <tr
                                key={report.id}
                                className={`transition-colors duration-150 ${
                                  darkMode
                                    ? idx % 2 === 0 ? "bg-gray-900/30" : "bg-transparent"
                                    : idx % 2 === 0 ? "bg-gray-50/60" : "bg-transparent"
                                } ${darkMode ? "hover:bg-gray-800" : "hover:bg-pink-50"}`}
                              >
                                <td className={`py-3.5 px-2 rounded-l-xl font-mono text-xs ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                                  {report.id.slice(0, 5)}
                                </td>

                                <td className={`py-3.5 px-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                    report.reportType === "Lost"
                                      ? darkMode ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"
                                      : darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                                  }`}>
                                    {report.reportType}
                                  </span>
                                </td>

                                <td className={`py-3.5 px-2 font-medium ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                                  {report.itemname}
                                </td>

                                 <td className={`py-3.5 px-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                                  {report.status}
                                </td>

                                <td className={`py-3.5 px-2 rounded-r-xl ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                  {report.date}
                                </td>
                        </tr>
                        ))
                    ) : (
                        <tr>
                        <td
                            colSpan="4"
                            className="text-center py-12"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                              <span className="text-lg">📋</span>
                            </div>
                            <p className="text-gray-400 text-sm">No reports found</p>
                          </div>
                        </td>
                        </tr>
                    )}
                    </tbody>
            </table>
          </div>
        </div>

        {/* ACTIVITY */}
        <div
          className={`rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md ${
            darkMode
              ? "bg-gray-900/60 border-gray-800 text-white"
              : "bg-white border-gray-100"
          }`}
        >
            <h2 className="text-lg font-bold text-pink-600 mb-5">
                Recent Activity
            </h2>

            <div className="space-y-4">
                {activities.length > 0 ? (
                activities.map((activity, index) => (
                    <div
                    key={index}
                    className={`relative pl-4 pb-1 border-l-2 border-pink-500 transition-colors duration-200 ${
                      darkMode ? "hover:border-pink-400" : "hover:border-pink-600"
                    }`}
                    >
                      <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-pink-500"></span>
                      <p
                        className={`font-medium text-sm ${
                          darkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {activity.title}
                      </p>

                        <p
                          className={`text-xs mt-0.5 ${
                            darkMode ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          {timeAgo(activity.time)}
                        </p>
                    </div>
                ))
                ) : (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                    <span className="text-lg">🔔</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                      No recent activity found.
                  </p>
                </div>
                )}
            </div>
            </div>
      </div>
    </div>
  );
}