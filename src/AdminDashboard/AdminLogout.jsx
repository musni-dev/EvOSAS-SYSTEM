import { useNavigate } from "react-router-dom";

export default function AdminLogout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (confirmed) {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("acceptedTerms");

            //  AUTH CHANGE
            
      window.dispatchEvent(new Event("authChanged"));

    navigate("/");
       }
  };
 
  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition shadow-md"
    >
      Logout
    </button>
  );
}