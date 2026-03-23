import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(false);

  return (
    <div
      className="w-72 relative flex flex-col items-center"
      style={{
        backgroundColor: "#4a5568",
        backgroundImage: `url(/assets/wolf.png)`,
        backgroundSize: "350px",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
      }}
    >
      <div className="absolute inset-0 bg-[#4a5568]/70" />

      <div className="relative z-10 p-4 space-y-4 text-white w-full">
        {/* Homepage */}
        <div
          onClick={() => navigate("/admin/homepage")}
          className="bg-[#5a6378]/90 px-4 py-3 rounded-full hover:bg-[#6b7280] cursor-pointer text-center transition"
        >
          Homepage
        </div>

        {/* Fill Up Form */}
        <div
          onClick={() => navigate("/admin/fill-up-form")}
          className="bg-[#5a6378]/90 px-4 py-3 rounded-full hover:bg-[#6b7280] cursor-pointer text-center transition"
        >
          Fill up Form
        </div>

        {/* Verbal Warning Dropdown */}
        <div>
          <div
            onClick={() => setOpenDropdown(!openDropdown)}
            className="relative bg-[#5a6378]/90 px-4 py-3 rounded-full hover:bg-[#6b7280] cursor-pointer transition text-center"
          >
            Verbal Warning
            <ChevronDown
              size={18}
              className={`absolute right-5 top-1/2 -translate-y-1/2 transition-transform duration-300 ${
                openDropdown ? "rotate-180" : ""
              }`}
            />
          </div>

          {openDropdown && (
            <div className="mt-2 space-y-2 ml-4">
              <div
                onClick={() => navigate("/admin/written-warning")}
                className="bg-[#6b7280]/90 px-4 py-2 rounded-full hover:bg-[#7c8596] cursor-pointer text-sm text-center"
              >
                Written Warning
              </div>

              <div
                onClick={() => navigate("/admin/1st-offense")}
                className="bg-[#6b7280]/90 px-4 py-2 rounded-full hover:bg-[#7c8596] cursor-pointer text-sm text-center"
              >
                1st Offense
              </div>

              <div
                onClick={() => navigate("/admin/2nd-offense")}
                className="bg-[#6b7280]/90 px-4 py-2 rounded-full hover:bg-[#7c8596] cursor-pointer text-sm text-center"
              >
                2nd Offense
              </div>

              <div
                onClick={() => navigate("/admin/3rd-offense")}
                className="bg-[#6b7280]/90 px-4 py-2 rounded-full hover:bg-[#7c8596] cursor-pointer text-sm text-center"
              >
                3rd Offense
              </div>
            </div>
          )}
        </div>

        {/* Other Routes */}
        <div
          onClick={() => navigate("/admin/article7")}
          className="bg-[#5a6378]/90 px-4 py-3 rounded-full hover:bg-[#6b7280] cursor-pointer text-center transition"
        >
          Article 7
        </div>

        <div
          onClick={() => navigate("/admin/article10")}
          className="bg-[#5a6378]/90 px-4 py-3 rounded-full hover:bg-[#6b7280] cursor-pointer text-center transition"
        >
          Article 10
        </div>

        <div
          onClick={() => navigate("/admin/approval-case")}
          className="bg-[#5a6378]/90 px-4 py-3 rounded-full hover:bg-[#6b7280] cursor-pointer text-center transition"
        >
          Approval of Case
        </div>
      </div>
    </div>
  );
}