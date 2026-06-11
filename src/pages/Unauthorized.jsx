import { Link } from "react-router-dom";


export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
        <h1 className="text-2xl font-bold text-pink-600">Unauthorized</h1>
        <p className="mt-2 text-slate-600">
          You do not have permission to access this page.
        </p>
        <Link
          to="/"
          className="inline-block mt-5 rounded-md bg-pink-600 px-4 py-2 text-white"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}