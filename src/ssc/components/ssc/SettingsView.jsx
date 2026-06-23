export default function SettingsView() {
  return (
    <div className="p-5 space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>

      <input
        type="password"
        placeholder="New Password"
        className="w-full border p-2 rounded"
      />

      <button className="bg-pink-600 text-white px-4 py-2 rounded">
        Change Password
      </button>
    </div>
  );
}