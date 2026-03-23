import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import osasLogo from "../assets/osas-logo.png";
import wolfBg from "../assets/wolf.png";
import AdminLogout from "./AdminLogout";



export default function Homepage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(false);


  /* AUTO OPEN DROPDOWN */
  useEffect(() => {
    if (
      location.pathname.includes("written-warning") ||
      location.pathname.includes("offense")
    ) {
      setOpenDropdown(true);
    }
  }, [location.pathname]);

  /* SIDEBAR ITEM */
  const SidebarItem = ({ label, path }) => {
    const isActive = location.pathname === path;

    return (
      <div
        onClick={() => navigate(path)}
        className={`px-4 py-3 rounded-full text-center cursor-pointer transition font-medium
        ${
          isActive
            ? "bg-blue-500 text-white shadow-lg"
            : "bg-[#5a6378]/90 hover:bg-[#6b7280] text-white"
        }`}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#2d3748]">

      {/* HEADER */}
      <div className="bg-blue-400 h-24 flex items-center px-8 justify-between shadow-md">
        <div className="flex items-center">
          <img
            src={osasLogo}
            alt="OSAS Logo"
            className="w-48 h-16 object-contain mr-6"
          />
          <div className="h-12 w-[2px] bg-black mr-6" />
          <h1 className="text-2xl font-serif font-semibold">
            Admin Dashboard
          </h1>
        </div>

        <AdminLogout />
      </div>

      <div className="flex flex-1 relative overflow-hidden">

        {/* SIDEBAR */}
        <div
          className="w-72 relative flex flex-col items-center"
          style={{
            backgroundImage: `url(${wolfBg})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        >
          {/*  Removed blur overlay */}
          <div className="absolute inset-0 bg-[#4a5568]/70" />

          <div className="relative z-10 p-4 space-y-4 text-white w-full">

            <SidebarItem label="Homepage" path="/admin/homepage" />
            <SidebarItem label="Fill up form" path="/admin/fill-up-form" />

            {/* DROPDOWN */}
            <div>
              <div
                onClick={() => setOpenDropdown(!openDropdown)}
                className="relative px-4 py-3 rounded-full bg-[#5a6378]/90 hover:bg-[#6b7280] cursor-pointer text-center transition"
              >
                Verbal Warning
                <ChevronDown
                  size={18}
                  className={`absolute right-5 top-1/2 -translate-y-1/2 transition-transform duration-300 ${
                    openDropdown ? "rotate-180" : ""
                  }`}
                />
              </div>

              <div
                className={`transition-all duration-300 overflow-hidden ${
                  openDropdown ? "max-h-96 mt-2" : "max-h-0"
                }`}
              >
                <div className="space-y-2 ml-4">
                  <SidebarItem label="Written Warning" path="/admin/written-warning" />
                  <SidebarItem label="1st Offense" path="/admin/1st-offense" />
                  <SidebarItem label="2nd Offense" path="/admin/2nd-offense" />
                  <SidebarItem label="3rd Offense" path="/admin/3rd-offense" />
                </div>
              </div>
            </div>

            <SidebarItem label="Article 7" path="/admin/article7" />
            <SidebarItem label="Article 10" path="/admin/article10" />
            <SidebarItem label="Approval of Case" path="/admin/approval-case" />

          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 flex justify-center items-center bg-[#2d3748] relative p-6">

          <div className="absolute w-[90%] max-w-[1000px] h-[600px] bg-gray-200 rounded-[30px] shadow-2xl" />

          <div className="relative z-10 flex flex-wrap gap-16 justify-center">
            <div
              onClick={() => navigate("/admin/total-case-2025")}
              className="w-64 h-40 bg-blue-400 rounded-2xl flex items-center justify-center text-xl font-serif cursor-pointer hover:scale-105 hover:shadow-2xl transition shadow-xl"
            >
              Total Case of 2025
            </div>

            <div
              onClick={() => navigate("/admin/lost-found")}
              className="w-64 h-40 bg-green-400 rounded-2xl flex items-center justify-center text-xl font-serif cursor-pointer hover:scale-105 hover:shadow-2xl transition shadow-xl"
            >
              Lost and Found
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}