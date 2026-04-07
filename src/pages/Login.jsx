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

      <div className="flex w-[590px] h-[580px] rounded-[40px] overflow-hidden shadow-2xl">

        {/* LEFT LOGOS */}
        <div className="w-1/4 bg-white flex flex-col items-center justify-center gap-6 rounded-l-[40px]">
          <img src={dctLogo} alt="DCT Logo" className="w-28" />
          <img src={osasLogo} alt="OSAS Logo" className="w-28" />
          <img src={sscLogo} alt="SSC Logo" className="w-28" />
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
          {/* DARK OVERLAY */}
          <div className="absolute inset-0 bg-[#0b2540]/85 rounded-r-[40px]" />

          {/* FORM */}
          <form
            onSubmit={handleLogin}
            className="relative z-20 w-full max-w-sm text-center space-y-4 px-10"
          >
            <p className="text-sm md:text-base font-serif tracking-widest">
              OSAS Portal System Log In
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

          {/* SIDE DECOR */}
          <div className="absolute left-0 top-0 h-full w-12 bg-white rounded-r-[80px]" />
        </div>
      </div>
    </div>
  );
}