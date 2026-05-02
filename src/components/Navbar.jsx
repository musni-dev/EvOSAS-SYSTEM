import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DCTlogo from "../assets/dct-logo.png";

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Announcements", path: "/announcements" },
  { label: "About", path: "/about" },
 
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path
      ? "text-[#ff6699] border-b-2 border-[#ff6699]"
      : "text-gray-700 hover:text-[#ff77aa] hover:bg-[#ff77aa]/10";

  return (
    <>
      {/* NAVBAR */}
      <nav className="bg-white sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between px-4 md:px-8 h-16">
          
          {/* 🔥 BRAND (UPDATED) */}
          <Link
            to="/"
            className="flex items-center font-extrabold cursor-pointer hover:scale-105 transition"
          >
            <img
              src={DCTlogo}
              alt="DCT Logo"
              className="h-18 w-18 object-contain"
            />

            <span className="text-2xl md:text-3xl font-black tracking-wide text-[#ff6699]">
              EvOSAS
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <ul className="hidden md:flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${isActive(item.path)}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2">
            {/* LOGIN BUTTON */}
            <Link
              to="/login"
              className="hidden md:flex bg-[#ff6699] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#ff77aa] transition"
            >
              Login
            </Link>

            {/* HAMBURGER */}
            <button
              className="md:hidden text-2xl text-gray-700"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="md:hidden bg-white px-4 py-3 space-y-2 shadow-lg">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className="block text-gray-700 py-2 border-b border-gray-200 text-sm font-medium hover:text-[#ff77aa] hover:bg-[#ff77aa]/10"
              >
                {item.label}
              </Link>
            ))}

            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block mt-2 bg-[#ff6699] text-white py-2 rounded-lg font-bold text-center hover:bg-[#ff77aa] transition"
            >
              Login
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}