export default function HomeView({ onScanPress }) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      
      <button
        onClick={onScanPress}
        className="w-48 h-48 rounded-full bg-pink-600 text-white font-bold"
      >
        Scan Attendance
      </button>

    </div>
  );
}