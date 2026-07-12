import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,} from "recharts";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit, getDocs,} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { LayoutDashboard, CalendarDays, FileWarning, PackageSearch, PackageCheck, Users, ArrowUpRight, Minus, FolderPlus, UserPlus, Bell, Inbox, ClipboardList,} from "lucide-react";

export default function DashboardPage({ darkMode }) {
  const [stats, setStats] = useState({
    totalCases: 0,
    lost: 0,
    found: 0,
    users: 0,
    todayCases: 0,
    lostThisWeek: 0,
    foundThisWeek: 0,
    usersThisMonth: 0,
  });

  const [dailyReports, setDailyReports] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "lost_found"), (snapshot) => {
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
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubCases = onSnapshot(collection(db, "cases"), (snapshot) => {
      const today = new Date().toDateString();

      const todayCount = snapshot.docs.filter((doc) => {
        const data = doc.data();
        if (!data.createdAt) return false;

        return data.createdAt.toDate().toDateString() === today;
      }).length;

      setStats((prev) => ({
        ...prev,
        totalCases: snapshot.size,
        todayCases: todayCount,
      }));
    });

    const unsubLostFound = onSnapshot(
      collection(db, "lost_found"),
      (snapshot) => {
        const reports = snapshot.docs.map((doc) => doc.data());

        const now = new Date();

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);

        const lost = reports.filter((item) => item.reportType === "Lost").length;

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

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
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
    });

    return () => {
      unsubCases();
      unsubLostFound();
      unsubUsers();
    };
  }, []);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const users = snapshot.docs.map((doc) => doc.data());

      const total = users.length;

      const active = users.filter((user) => user.status === "Active").length;

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
    });

    return () => unsubUsers();
  }, []);

  const COLORS = [
    "#E0245E", // total
    "#10B981", // active
    "#EF4444", // inactive
  ];

  useEffect(() => {
    const fetchRecentData = async () => {
      try {
        // Lost & Found
        const lostSnap = await getDocs(
          query(collection(db, "lost_found"), orderBy("createdAt", "desc"), limit(5))
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
          query(collection(db, "cases"), orderBy("createdAt", "desc"), limit(5))
        );

        const activityData = caseSnap.docs.map((doc) => ({
          title: `New Case Added`,
          time: doc.data().createdAt?.toDate()?.toLocaleString(),
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
          query(collection(db, "cases"), orderBy("createdAt", "desc"), limit(5))
        );

        casesSnap.forEach((doc) => {
          activityList.push({
            title: "New Disciplinary Case Added",
            time: doc.data().createdAt?.toDate(),
          });
        });

        // LOST & FOUND
        const lostSnap = await getDocs(
          query(collection(db, "lost_found"), orderBy("createdAt", "desc"), limit(5))
        );

        lostSnap.forEach((doc) => {
          activityList.push({
            title: `${doc.data().reportType} Item Submitted`,
            time: doc.data().createdAt?.toDate(),
          });
        });

        // USERS
        const userSnap = await getDocs(
          query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5))
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

  // Presentational-only helper — purely for choosing an icon in the timeline,
  // does not touch any state or data logic.
  function getActivityIcon(title = "") {
    if (title.includes("Case")) return FileWarning;
    if (title.includes("Lost")) return PackageSearch;
    if (title.includes("Found")) return PackageCheck;
    if (title.includes("User")) return UserPlus;
    return Bell;
  }

  const cardBase = darkMode
    ? "bg-[#111827] border-[#1E2937] text-white"
    : "bg-white border-[#E7E9F0] text-gray-900";

  const subtleText = darkMode ? "text-gray-500" : "text-gray-400";
  const mutedText = darkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div
      className={`flex-1 overflow-auto p-5 sm:p-8 transition-colors duration-300 ${
        darkMode ? "bg-[#0A0E17] text-white" : "bg-[#F6F7FB] text-gray-900"
      }`}
    >
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              darkMode ? "bg-[#E0245E]/15" : "bg-[#E0245E]/10"
            }`}
          >
            <LayoutDashboard className="w-6 h-6 text-[#E0245E]" strokeWidth={2} />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              EvOSAS Dashboard
            </h1>

            <p className={`mt-1 text-sm ${mutedText}`}>
              Monitor reports, attendance, events and analytics.
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${cardBase}`}
        >
          <CalendarDays className="w-4 h-4 text-[#E0245E]" />
          <span className="font-semibold text-sm tracking-wide tabular-nums">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          darkMode={darkMode}
          icon={FileWarning}
          accent="#E0245E"
          label="Total Case Reports"
          value={stats.totalCases}
          delta={stats.todayCases ? `+${stats.todayCases} today` : "No updates today"}
          positive={stats.todayCases > 0}
        />

        <StatCard
          darkMode={darkMode}
          icon={PackageSearch}
          accent="#4F46E5"
          label="Lost Items"
          value={stats.lost}
          delta={
            stats.lostThisWeek > 0
              ? `+${stats.lostThisWeek} this week`
              : "No reports this week"
          }
          positive={stats.lostThisWeek > 0}
        />

        <StatCard
          darkMode={darkMode}
          icon={PackageCheck}
          accent="#10B981"
          label="Found Items"
          value={stats.found}
          delta={
            stats.foundThisWeek > 0
              ? `+${stats.foundThisWeek} this week`
              : "No reports this week"
          }
          positive={stats.foundThisWeek > 0}
        />

        <StatCard
          darkMode={darkMode}
          icon={Users}
          accent="#F59E0B"
          label="Users"
          value={stats.users}
          delta={
            stats.usersThisMonth > 0
              ? `+${stats.usersThisMonth} this month`
              : "No new users this month"
          }
          positive={stats.usersThisMonth > 0}
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* BAR CHART */}
        <div className={`xl:col-span-2 rounded-3xl border p-6 shadow-sm ${cardBase}`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold">Report Items Per Day</h2>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
                darkMode ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"
              }`}
            >
              This week
            </span>
          </div>
          <p className={`text-xs mb-4 ${subtleText}`}>
            Weekly distribution of lost &amp; found submissions
          </p>

          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={dailyReports}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={darkMode ? "#1E2937" : "#EEF0F5"}
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke={darkMode ? "#6B7280" : "#9CA3AF"}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={darkMode ? "#6B7280" : "#9CA3AF"}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: darkMode ? "1px solid #1E2937" : "1px solid #E7E9F0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  background: darkMode ? "#111827" : "#ffffff",
                  color: darkMode ? "#fff" : "#111827",
                  fontSize: "13px",
                }}
                cursor={{ fill: "#E0245E", fillOpacity: 0.06 }}
              />
              <Bar dataKey="reports" fill="#E0245E" radius={[8, 8, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART */}
        <div className={`rounded-3xl border p-6 shadow-sm ${cardBase}`}>
          <h2 className="text-base font-bold mb-1">User Distribution</h2>
          <p className={`text-xs mb-4 ${subtleText}`}>Breakdown by account status</p>

          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={105}
                innerRadius={62}
                paddingAngle={3}
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
                  border: darkMode ? "1px solid #1E2937" : "1px solid #E7E9F0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  background: darkMode ? "#111827" : "#ffffff",
                  color: darkMode ? "#fff" : "#111827",
                  fontSize: "13px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium">
            <LegendDot color="#E0245E" label="Total Users" darkMode={darkMode} />
            <LegendDot color="#10B981" label="Active" darkMode={darkMode} />
            <LegendDot color="#EF4444" label="Inactive" darkMode={darkMode} />
          </div>
        </div>
      </div>

      {/* TABLE + ACTIVITY */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* TABLE */}
        <div className={`xl:col-span-2 rounded-3xl border p-6 shadow-sm ${cardBase}`}>
          <div className="flex items-center gap-2 mb-5">
            <ClipboardList className="w-4 h-4 text-[#E0245E]" />
            <h2 className="text-base font-bold">Recent Reports — Lost &amp; Found</h2>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  {["Report ID", "Lost/Found", "Item Name", "Status", "Date"].map(
                    (col) => (
                      <th
                        key={col}
                        className={`text-left py-3 px-2 font-semibold text-[11px] uppercase tracking-wider sticky top-0 ${
                          darkMode
                            ? "text-gray-500 bg-[#111827]"
                            : "text-gray-400 bg-white"
                        }`}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {recentReports.length > 0 ? (
                  recentReports.map((report, idx) => (
                    <tr
                      key={report.id}
                      className={`transition-colors duration-150 ${
                        darkMode
                          ? idx % 2 === 0
                            ? "bg-white/[0.02]"
                            : "bg-transparent"
                          : idx % 2 === 0
                          ? "bg-gray-50/60"
                          : "bg-transparent"
                      } ${darkMode ? "hover:bg-white/5" : "hover:bg-[#E0245E]/5"}`}
                    >
                      <td
                        className={`py-3.5 px-2 rounded-l-xl font-mono text-xs ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {report.id.slice(0, 5)}
                      </td>

                      <td className="py-3.5 px-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            report.reportType === "Lost"
                              ? darkMode
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-amber-50 text-amber-600"
                              : darkMode
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {report.reportType}
                        </span>
                      </td>

                      <td
                        className={`py-3.5 px-2 font-medium ${
                          darkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {report.itemname}
                      </td>

                      <td className={`py-3.5 px-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {report.status}
                      </td>

                      <td
                        className={`py-3.5 px-2 rounded-r-xl text-xs ${
                          darkMode ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {report.date}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-14">
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center ${
                            darkMode ? "bg-white/5" : "bg-gray-100"
                          }`}
                        >
                          <Inbox className={`w-5 h-5 ${mutedText}`} />
                        </div>
                        <p className={`text-sm ${mutedText}`}>No reports found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIVITY */}
        <div className={`rounded-3xl border p-6 shadow-sm ${cardBase}`}>
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-4 h-4 text-[#E0245E]" />
            <h2 className="text-base font-bold">Recent Activity</h2>
          </div>

          <div className="space-y-1">
            {activities.length > 0 ? (
              activities.map((activity, index) => {
                const Icon = getActivityIcon(activity.title);
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 py-3 ${
                      index !== activities.length - 1
                        ? darkMode
                          ? "border-b border-[#1E2937]"
                          : "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        darkMode ? "bg-[#E0245E]/10" : "bg-[#E0245E]/10"
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#E0245E]" />
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`font-medium text-sm truncate ${
                          darkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {activity.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${subtleText}`}>
                        {timeAgo(activity.time)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-3 py-10">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    darkMode ? "bg-white/5" : "bg-gray-100"
                  }`}
                >
                  <Bell className={`w-5 h-5 ${mutedText}`} />
                </div>
                <p className={`text-sm ${mutedText}`}>No recent activity found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ darkMode, icon: Icon, accent, label, value, delta, positive }) {
  return (
    <div
      className={`rounded-3xl p-6 border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        darkMode ? "bg-[#111827] border-[#1E2937] text-white" : "bg-white border-[#E7E9F0]"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}1A` }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} strokeWidth={2} />
        </div>
      </div>

      <p
        className={`text-xs font-semibold uppercase tracking-wider ${
          darkMode ? "text-gray-500" : "text-gray-400"
        }`}
      >
        {label}
      </p>

      <h2 className="text-3xl sm:text-4xl font-bold mt-2 font-mono tabular-nums">
        {value}
      </h2>

      <p
        className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${
          positive ? "text-emerald-500" : darkMode ? "text-gray-500" : "text-gray-400"
        }`}
      >
        {positive ? (
          <ArrowUpRight className="w-3.5 h-3.5" />
        ) : (
          <Minus className="w-3.5 h-3.5" />
        )}
        {delta}
      </p>
    </div>
  );
}

function LegendDot({ color, label, darkMode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className={darkMode ? "text-gray-300" : "text-gray-600"}>{label}</span>
    </div>
  );
}