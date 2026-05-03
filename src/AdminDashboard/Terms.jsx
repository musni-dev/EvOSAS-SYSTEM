import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";


export default function Terms() {
  const navigate = useNavigate();

  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    localStorage.setItem("acceptedTerms", "true");
    navigate("/admin/adminhome");
  };

  const handleClose = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-100">
      
      {/* Fake Dashboard Background */}
      <div className="absolute inset-0 flex">
        
        {/* Sidebar */}
        <div className="w-64 bg-white text-white hidden md:flex flex-col">
          <div className="p-6 text-2xl font-bold border-b border-gray-800">
            EvOSAS Admin
          </div>

          <div className="flex flex-col gap-3 p-5 text-gray-300">
            <div className="bg-pink-500 text-white px-4 py-3 rounded-xl">
              Dashboard
            </div>

            <div className="hover:bg-gray-800 px-4 py-3 rounded-xl transition">
              Student Cases
            </div>

            <div className="hover:bg-gray-800 px-4 py-3 rounded-xl transition">
              Reports
            </div>

            <div className="hover:bg-gray-800 px-4 py-3 rounded-xl transition">
              Violations
            </div>

            <div className="hover:bg-gray-800 px-4 py-3 rounded-xl transition">
              Accounts
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 bg-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white rounded-2xl shadow-lg p-6 h-40">
              <h2 className="text-gray-500 text-sm">Total Students</h2>
              <p className="text-4xl font-bold text-black mt-4">1,250</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 h-40">
              <h2 className="text-gray-500 text-sm">Active Cases</h2>
              <p className="text-4xl font-bold text-pink-500 mt-4">32</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 h-40">
              <h2 className="text-gray-500 text-sm">Resolved Reports</h2>
              <p className="text-4xl font-bold text-black mt-4">210</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blur Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
        
        {/* Modal */}
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b bg-gradient-to-r from-pink-500 to-pink-400">
            
            <div>
              <h1 className="text-2xl font-bold text-white">
                Data Privacy & Terms
              </h1>

              <p className="text-pink-100 text-sm">
                OSAS Management System
              </p>
            </div>

            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 p-2 rounded-full transition"
            >
              <X size={22} />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800">
                Terms and Conditions
              </h2>

              <p className="text-gray-500 mt-2">
                Please read carefully before accessing the admin dashboard.
              </p>
            </div>

            {/* Terms */}
            <div className="h-72 overflow-y-auto border border-gray-200 rounded-2xl p-6 bg-gray-50 space-y-5 text-gray-700 leading-relaxed">
              
              <p>
                By accessing and using the EvOSAS Management System, you agree
                to comply with all institutional policies and data privacy
                regulations implemented by the school administration.
              </p>

              <p>
                All disciplinary records, student information, reports, and
                confidential files stored within the system must only be
                accessed by authorized personnel.
              </p>

              <p>
                Administrators are responsible for maintaining the accuracy,
                confidentiality, and integrity of all submitted records and
                reports.
              </p>

              <p>
                Unauthorized sharing, exporting, tampering, or misuse of
                confidential information may result in disciplinary action and
                suspension of system access privileges.
              </p>

              <p>
                The system logs user activities for monitoring and security
                purposes to ensure accountability within the administration.
              </p>

              <p>
                By clicking{" "}
                <span className="font-semibold text-pink-500">
                  Accept
                </span>,
                you confirm that you fully understand and agree
                to these terms, conditions, and privacy policies.
              </p>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3">
              
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 h-5 w-5 accent-pink-500 cursor-pointer"
              />

              <p className="text-sm text-gray-600">
                I have read and agreed to the Terms and Conditions
                and Data Privacy Policy.
              </p>
            </div>

            {/* Button */}
            <div className="flex justify-center pt-2">
              
              <button
                onClick={handleAccept}
                disabled={!checked}
                className={`font-semibold px-10 py-3 rounded-xl shadow-lg transition duration-300
                ${
                  checked
                    ? "bg-pink-500 hover:bg-pink-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}