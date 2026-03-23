 import { useNavigate } from "react-router-dom";

export default function Terms() {
  const navigate = useNavigate();

  const handleAccept = () => {
    // Save acceptance
    localStorage.setItem("acceptedTerms", "true");
    navigate("/admin/homepage");
  };

  const handleDecline = () => {
    // Auto logout kapag decline
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("acceptedTerms");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800 px-6">
      
      <div className="bg-white max-w-3xl w-full p-10 rounded-2xl shadow-2xl space-y-8">
        
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Terms and Conditions / Data Privacy
        </h1>

        <div className="h-64 overflow-y-auto border p-6 rounded-lg text-gray-600 text-sm space-y-4">
          <p>
            By accessing and using this OSAS Management System, you agree to comply
            with all institutional policies and data privacy regulations.
          </p>

          <p>
            All student case records, warnings, and reports stored in this system
            are confidential and must not be shared with unauthorized individuals.
          </p>

          <p>
            Administrators are responsible for maintaining the integrity and
            accuracy of all encoded data.
          </p>

          <p>
            Misuse of this system, unauthorized access, or data tampering may
            result in disciplinary action in accordance with school policies.
          </p>

          <p>
            By clicking "Accept", you confirm that you understand and agree
            to these terms and conditions.
          </p>
        </div>

        <div className="flex justify-center gap-8">
          <button
            onClick={handleAccept}
            className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition shadow-md"
          >
            Accept
          </button>

          <button
            onClick={handleDecline}
            className="bg-red-500 text-white px-8 py-3 rounded-lg hover:bg-red-600 transition shadow-md"
          >
            Decline
          </button>
        </div>

      </div>
    </div>
  );
}