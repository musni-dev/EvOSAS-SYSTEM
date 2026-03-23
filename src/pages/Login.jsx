import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dctLogo from "../assets/dct-logo.png";
import osasLogo from "../assets/osas-logo.png";
import sscLogo from "../assets/ssc-logo.png";
import wolfBg from "../assets/wolf.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);

    // simulate small delay (optional but smoother UX)
    setTimeout(() => {
      if (email === "admin" && password === "admin") {
        //  save login
        localStorage.setItem("isLoggedIn", "true");

        //  IMPORTANT: notify App.jsx to re-render
        window.dispatchEvent(new Event("authChanged"));

        //  go to terms first if not accepted
        const accepted = localStorage.getItem("acceptedTerms");
        if (!accepted) {
          navigate("/terms");
        } else {
          navigate("/admin/homepage");
        }
      } else {
        alert("Invalid username or password");
      }

      setLoading(false);
    }, 400);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-200 overflow-hidden">
      <div className="flex w-[590px] h-[580px] rounded-[40px] overflow-hidden shadow-2xl">
        
        {/* LEFT LOGO COLUMN */}
        <div className="w-1/4 bg-white flex flex-col items-center justify-center gap-6 rounded-l-[40px]">
          <img src={dctLogo} alt="DCT Logo" className="w-35" />
          <img src={osasLogo} alt="OSAS Logo" className="w-35" />
          <img src={sscLogo} alt="SSC Logo" className="w-35" />
        </div>

        {/* RIGHT LOGIN PANEL */}
        <div
          className="w-3/4 relative bg-[#0b2540] text-white flex items-center justify-center rounded-r-[40px]"
          style={{
            backgroundImage: `url(${wolfBg})`,
            backgroundSize: "420px",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-[#0b2540]/85 rounded-r-[40px]" />

          <form
            onSubmit={handleLogin}
            className="relative z-20 w-full max-w-sm text-center space-y-3 px-20"
          >
            <p className="text-sm md:text-base font-serif tracking-widest">
              STUDENT DISCIPLINE
            </p>
            <p className="text-xs md:text-sm font-serif tracking-widest">
              RECORD
            </p>
            
              
            
            <input
              type="text"
              placeholder="Username:"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-full bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />

            <input
              type="password"
              placeholder="Password:"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-full bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 transition px-12 py-2 rounded-full text-white font-semibold disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="absolute left-0 top-0 h-full w-12 bg-white rounded-r-[80px]" />
        </div>
      </div>
    </div>
  );
}