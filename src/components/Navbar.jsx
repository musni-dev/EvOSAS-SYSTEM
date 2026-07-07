import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import osasLogo from "../assets/osas-logo.png";
import { useTheme } from "../context/ThemeContext";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Toggle background style once the user scrolls past the hero
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 dark:bg-[#1a1a1a]/85 backdrop-blur-lg shadow-[0_4px_30px_rgba(255,102,153,0.08)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] py-3"
          : "bg-transparent py-5"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#2a2a2a] shadow-md ring-1 ring-pink-100 dark:ring-white/10 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
            <img src={osasLogo} alt="OSAS logo" className="w-8 h-8 object-contain" />
          </div>
          <span
            className="font-semibold text-lg tracking-tight text-[#2d2d2d] dark:text-white transition-colors"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            EvOSAS
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative text-sm font-medium text-[#4b4b4b] dark:text-gray-300 hover:text-[#ff6699] dark:hover:text-[#ff77aa] transition-colors after:content-[''] after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-pink-500 after:to-rose-400 after:transition-all hover:after:w-full ${
                location.pathname === link.to ? "text-[#ff6699] dark:text-[#ff77aa] after:w-full" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}

          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 bg-pink-50 dark:bg-white/10 hover:bg-pink-100 dark:hover:bg-white/20 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            to="/login"
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-pink-500 via-pink-400 to-rose-400 shadow-md shadow-pink-200 dark:shadow-pink-500/20 hover:shadow-lg hover:shadow-pink-300 hover:scale-105 transition-all duration-300"
          >
            Login
          </Link>
        </div>

        {/* Mobile toggle + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 bg-pink-50 dark:bg-white/10 hover:bg-pink-100 dark:hover:bg-white/20 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="p-2 rounded-full text-[#2d2d2d] dark:text-white hover:bg-pink-50 dark:hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden overflow-hidden bg-white/95 dark:bg-[#1a1a1a]/98 backdrop-blur-lg border-t border-pink-50 dark:border-white/10"
          >
            <div className="flex flex-col px-6 py-4 gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 text-base font-medium text-[#2d2d2d] dark:text-gray-200 hover:text-[#ff6699] dark:hover:text-[#ff77aa] border-b border-pink-50/80 dark:border-white/5 last:border-none"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-4 mb-2 text-center px-5 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-pink-500 via-pink-400 to-rose-400 shadow-md"
              >
                Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}