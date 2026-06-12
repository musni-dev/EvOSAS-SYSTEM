
import { useNavigate } from "react-router-dom";


export default function sdoHomepage() {


      const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("acceptedTerms");

    navigate("/login");
  };
  return (
 <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-10 shadow-md border border-white">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Student Disciplinary Ofiicer wilcam pu
        </h1>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
        >
          Logout
        </button>
      </div>

      <p className="text-gray-500 mt-4">
wowowowowow      
</p>
    </div>
  );
}