import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";

import dctLogo from "../assets/dct-logo.png";
import osasLogo from "../assets/osas-logo.png";
import sscLogo from "../assets/ssc-logo.png";
import wolfBg from "../assets/wolf.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔥 Firebase login (REAL AUTH)
      await signInWithEmailAndPassword(auth, email, password);

      // save login state
      localStorage.setItem("isLoggedIn", "true");

      // notify app (for App.jsx state refresh)
      window.dispatchEvent(new Event("authChanged"));

      // check terms acceptance
      const accepted = localStorage.getItem("acceptedTerms");

      if (!accepted) {
        navigate("/terms");
      } else {
        navigate("/admin/homepage");
      }

    } catch (error) {
      console.log("Login error:", error.message);
      alert("Invalid email or password");
    }

    setLoading(false);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-200 overflow-hidden">

        <div className="flex flex-col md:flex-row w-full md:w-[850px] h-auto md:h-[500px] rounded-3xl overflow-hidden shadow-2xl mx-auto">
        {/* LEFT LOGOS */}
         <div className="w-full md:w-1/3 bg-white flex flex-row md:flex-col items-center justify-center gap-6 py-6 md:py-10">
          <img src={dctLogo} alt="DCT Logo" className="w-40" />
          <img src={osasLogo} alt="OSAS Logo" className="w-40" />
          <img src={sscLogo} alt="SSC Logo" className="w-40" />
        </div>

        {/* RIGHT LOGIN PANEL */}
        <div
           className="w-full md:w-2/3 relative bg-[#0d284a] flex flex-col items-center justify-center py-8 md:py-0 px-6"
   
          style={{
            backgroundImage: `url(${wolfBg})`,
            backgroundSize: "420px",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        >
          {/* DARK OVERLAY */}
          <div className="absolute inset-0 bg-[#0b2540]/85 rounded-r-[40px]" />

          {/* FORM */}
          <form
            onSubmit={handleLogin}
            className="relative z-20 w-full max-w-sm text-center space-y-4 px-10"
          >
            <p className="text-2xl sm:text-2xl md:text-3xl font-bold font-sans italic tracking-wider text-white mb-4 text-center">
              OSAS Portal System
            </p>
            

            {/* EMAIL */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-full bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />

            {/* PASSWORD */}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-full bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 transition px-12 py-2 rounded-full text-white font-semibold disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}