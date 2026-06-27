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
        className={`flex-1 overflow-auto p-6 transition-all duration-300 ${
          darkMode
            ? "bg-[#0f172a] text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-pink-500">
            EVOSAS Dashboard
          </h1>

          <p className="text-gray-400 mt-2">
            Monitor reports, attendance, events and analytics.
          </p>
        </div>

        <div className={`px-5 py-3 rounded-2xl shadow border-2 ${
          darkMode
            ? "bg-gray-900 border-gray-700 text-white"
            : "bg-white border-pink-300"
        }`}>
          <span className="text-pink-600 font-semibold">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div className="bg-pink-600 text-white rounded-3xl p-6 border-2 border-pink-400">
          <p className="text-sm opacity-90">Case Reports</p>
          <h2 className="text-5xl font-bold mt-3">{stats.totalCases}</h2>
              <p className="mt-2 text-sm opacity-90">
              {stats.todayCases
                ? `+${stats.todayCases} Today`
                : "No updates today"}
            </p>
        </div>

        <div
          className={`rounded-3xl p-6 border-2 ${
            darkMode
              ? "bg-gray-900 border-gray-700 text-white"
              : "bg-white border-pink-200"
          }`}
        >
          <p className="text-gray-500">Lost Items</p>
          <h2 className="text-5xl font-bold text-pink-600 mt-3">{stats.lost}</h2>
          <p className="text-green-500 text-sm mt-2">
            {stats.lostThisWeek > 0
              ? `+${stats.lostThisWeek} this week`
              : "No reports this week"}
          </p>
        </div>

        <div
          className={`rounded-3xl p-6 border-2 ${
            darkMode
              ? "bg-gray-900 border-gray-700 text-white"
              : "bg-white border-pink-200"
          }`}
        >
          <p className="text-gray-500">Found Items</p>
          <h2 className="text-5xl font-bold text-pink-600 mt-3">{stats.found}</h2>
          <p className="text-green-500 text-sm mt-2">
           {stats.foundThisWeek > 0
            ? `+${stats.foundThisWeek} this week`
            : "No reports this week"}
          </p>
        </div>

        <div
          className={`rounded-3xl p-6 border-2 ${
            darkMode
              ? "bg-gray-900 border-gray-700 text-white"
              : "bg-white border-pink-200"
          }`}
        >
          <p className="text-gray-500">Users</p>
          <h2 className="text-5xl font-bold text-pink-600 mt-3">{stats.users}</h2>
          <p className="text-green-500 text-sm mt-2">
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
          className={`xl:col-span-2 rounded-3xl border-2 p-6 shadow ${
            darkMode
              ? "bg-gray-900 border-gray-700 text-white"
              : "bg-white border-pink-200"
          }`}
        >
          <h2 className="text-xl font-bold text-pink-600 mb-4">
            Report Items Per Day
          </h2>

          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dailyReports}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />

              <Bar
                dataKey="reports"
                fill="#ec4899"
                radius={[10, 10, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART */}
                <div
                  className={`rounded-3xl border-2 p-6 shadow transition-all duration-300 ${
                    darkMode
                      ? "bg-gray-900 border-gray-700 text-white"
                      : "bg-white border-pink-200"
                  }`}
                >
                <h2 className="text-xl font-bold text-pink-600 mb-4">
                    User Distribution
                </h2>

                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={120}
                        label
                    >
                        {pieData.map((entry, index) => (
                        <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                        />
                        ))}
                    </Pie>

                    <Tooltip />
                    </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                    Total Users
                    </div>

                    <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    Active
                    </div>

                    <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    Inactive
                    </div>
                </div>
                </div>
      </div>

      {/* TABLE + ACTIVITY */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* TABLE */}
        <div
          className={`xl:col-span-2 rounded-3xl border-2 p-6 shadow transition-all duration-300 ${
            darkMode
              ? "bg-gray-900 border-gray-700 text-white"
              : "bg-white border-pink-200"
          }`}
        >
          <h2 className="text-xl font-bold text-pink-600 mb-5">
            Recent Reports Lost and Found
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pink-200">
                  <th className="text-left py-3 text-pink-600">
                    Report ID
                  </th>

                  <th className="text-left py-3 text-pink-600">
                    Lost/Found
                  </th>

                  <th className="text-left py-3 text-pink-600">
                    Item Name
                  </th>

                  
                   <th className="text-left py-3 text-pink-600">
                    Status
                  </th>

                  <th className="text-left py-3 text-pink-600">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                    {recentReports.length > 0 ? (
                        recentReports.map((report) => (
                              <tr
                                key={report.id}
                                className={`border-b transition-colors duration-200 ${
                                  darkMode
                                    ? "border-gray-700 hover:bg-gray-800"
                                    : "border-pink-100 hover:bg-pink-50"
                                }`}
                              >
                                <td className={darkMode ? "py-4 text-white" : "py-4"}>
                                  {report.id.slice(0, 5)}
                                </td>

                                <td className={darkMode ? "text-gray-200" : ""}>
                                  {report.reportType}
                                </td>

                                <td className={darkMode ? "text-gray-200" : ""}>
                                  {report.itemname}
                                </td>

                                 <td className={darkMode ? "text-gray-200" : ""}>
                                  {report.status}
                                </td>

                                <td className={darkMode ? "text-gray-300" : ""}>
                                  {report.date}
                                </td>
                        </tr>
                        ))
                    ) : (
                        <tr>
                        <td
                            colSpan="4"
                            className="text-center py-6 text-gray-400"
                        >
                            No reports found
                        </td>
                        </tr>
                    )}
                    </tbody>
            </table>
          </div>
        </div>

        {/* ACTIVITY */}
        <div
          className={`rounded-3xl border-2 p-6 shadow transition-all duration-300 ${
            darkMode
              ? "bg-gray-900 border-gray-700 text-white"
              : "bg-white border-pink-200"
          }`}
        >
            <h2 className="text-xl font-bold text-pink-600 mb-5">
                Recent Activity
            </h2>

            <div className="space-y-5">
                {activities.length > 0 ? (
                activities.map((activity, index) => (
                    <div
                    key={index}
                    className="border-l-4 border-pink-500 pl-4"
                    >
                      <p
                        className={`font-medium ${
                          darkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {activity.title}
                      </p>

                        <p
                          className={`text-sm ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {timeAgo(activity.time)}
                        </p>
                    </div>
                ))
                ) : (
                <p className="text-gray-400">
                    No recent activity found.
                </p>
                )}
            </div>
            </div>
      </div>
    </div>
  );
}