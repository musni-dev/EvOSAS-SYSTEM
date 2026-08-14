import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import osasLogo from "../assets/osas-logo.png";
import sscLogo from "../assets/ssc-logo.png";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Login", to: "/login" },
];

const modules = [
  "Student Discipline Records",
  "Lost & Found Items",
  "SSC Attendance",
  "Event Evaluation",
  "Organization Files",
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-[#2d2d2d] dark:bg-[#111111] text-gray-300 pt-16 pb-8 overflow-hidden border-t border-transparent dark:border-white/5">
      {/* Ambient gradient accent */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-pink-500/20 via-pink-400/10 to-rose-400/20 blur-3xl rounded-full" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10 dark:border-white/5">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/95 shadow-md flex items-center justify-center overflow-hidden">
                <img src={osasLogo} alt="OSAS logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-white font-semibold text-lg">EvOSAS</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              The Official Evolution of the Office of Student Affairs and Services.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-wide uppercase">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="text-sm text-gray-400 hover:text-[#ff77aa] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* System Modules */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-wide uppercase">
              System Modules
            </h4>
            <ul className="space-y-2.5">
              {modules.map((mod) => (
                <li key={mod} className="text-sm text-gray-400">
                  {mod}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Logos */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-wide uppercase">
              Contact
            </h4>
                <a
                  href="https://www.facebook.com/dctofficeofstudentaffairs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 leading-relaxed mb-5 hover:text-pink-400 transition-colors duration-200"
                >
                  Dominican College of Tarlac
                  <br />
                  Office of Student Affairs and Services
                </a>

            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-white/95 shadow-md flex items-center justify-center overflow-hidden">
              
                <img src={osasLogo} alt="OSAS logo" className="w-9 h-9 object-contain" />
              </div>
              <div className="w-11 h-11 rounded-full bg-white/95 shadow-md flex items-center justify-center overflow-hidden">
                <img src={sscLogo} alt="SSC logo" className="w-9 h-9 object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>
            &copy; {year} Office of Student Affairs and Services (OSAS), Dominican
            College of Tarlac. All Rights Reserved.
          </p>
          <p className="flex items-center gap-1.5">
            Developed with <Heart size={12} className="text-[#ff6699] fill-[#ff6699]" /> by{" "}
            <span className="text-gray-300 font-medium">John Patrick Musni</span>
          </p>
        </div>
      </div>
    </footer>
  );
}