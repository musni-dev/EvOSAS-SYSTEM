import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";
import { mockStats, recentActivity, mockAttendance } from "../data/mockData";
import { Icon } from "../components/Icon";

export default function DashboardPage() {
  return (
    <div>
      <SectionHeader
        title="Overview"
        subtitle="Welcome back, Administrator — here's what's happening today."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mockStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border">
          <h3 className="font-semibold mb-4">Recent Activity</h3>

          {recentActivity.map((a, i) => (
            <div key={i} className="flex gap-3 py-2">
              <Icon name={a.icon} />
              <div>
                <p>{a.text}</p>
                <p className="text-xs text-gray-400">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}