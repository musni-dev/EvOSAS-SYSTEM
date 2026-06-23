import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";

export default function SSCNavbar({ setPage }) {
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <>
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow-md sticky top-0 z-50">
        
        <button
          onClick={() => setOpen(true)}
          className="text-2xl text-gray-700"
        >
          ☰
        </button>

        <h1 className="font-bold text-pink-600">SSC Attendance</h1>

        <div />
      </div>

      {/* SIDE DRAWER */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          
          <div
            className="flex-1 bg-black/40"
            onClick={() => setOpen(false)}
          />

          <div className="w-64 bg-white h-full p-5 flex flex-col gap-3">

            <button
              onClick={() => {
                setPage("home");
                setOpen(false);
              }}
              className="text-left p-2 rounded hover:bg-pink-50"
            >
              Home
            </button>

            <button
              onClick={() => {
                setPage("upload");
                setOpen(false);
              }}
              className="text-left p-2 rounded hover:bg-pink-50"
            >
              Upload QR
            </button>

            <button
              onClick={() => {
                setPage("settings");
                setOpen(false);
              }}
              className="text-left p-2 rounded hover:bg-pink-50"
            >
              Settings
            </button>

            <hr />

            <button
              onClick={logout}
              className="text-left p-2 text-red-500 hover:bg-red-50 rounded"
            >
              Logout
            </button>

          </div>
        </div>
      )}
    </>
  );
}