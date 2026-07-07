import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, animate } from "framer-motion";
import {
  BookOpen,
  ShieldCheck,
  ClipboardList,
  Bell,
  Search,
  Users,
  QrCode,
  FileBarChart,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import osasLogo from "../assets/osas-logo.png";
import sscLogo from "../assets/ssc-logo.png";

/* ---------------------------------- data ---------------------------------- */

const features = [
  {
    icon: ShieldCheck,
    title: "Student Discipline Management",
    desc: "Digitally manage disciplinary records.",
  },
  {
    icon: Search,
    title: "Lost and Found",
    desc: "Efficiently report and retrieve lost belongings.",
  },
  {
    icon: QrCode,
    title: "Attendance Monitoring",
    desc: "QR Code-based attendance system.",
  },
  {
    icon: ClipboardList,
    title: "Event Evaluation",
    desc: "Collect event feedback digitally.",
  },
  {
    icon: Bell,
    title: "Announcements",
    desc: "Share official announcements.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    desc: "Secure access for Admin, SSC, SOC, SDO, and Students.",
  },
];

const steps = [
  { icon: Users, label: "Login" },
  { icon: ShieldCheck, label: "Choose your role" },
  { icon: BookOpen, label: "Manage records" },
  { icon: FileBarChart, label: "Generate reports" },
  { icon: ClipboardList, label: "Monitor activities" },
];

const stats = [
  { value: 1500, suffix: "+", label: "Students" },
  { value: 250, suffix: "+", label: "Disciplinary Cases" },
  { value: 700, suffix: "+", label: "Attendance Records" },
  { value: 500, suffix: "+", label: "Lost & Found Reports" },
  { value: 99, suffix: "%", label: "System Availability" },
];

const checklist = [
  "Digital Student Services",
  "Secure Authentication",
  "Easy Record Management",
  "QR Attendance",
  "Event Evaluation",
  "Mobile Responsive",
  "Fast Performance",
  "User-Friendly Interface",
];

const floatingCards = [
  { label: "Student Records", icon: BookOpen, className: "top-[12%] left-[4%] sm:left-[8%]" },
  { label: "Attendance", icon: QrCode, className: "top-[8%] right-[4%] sm:right-[8%]" },
  { label: "Lost & Found", icon: Search, className: "bottom-[26%] left-[2%] sm:left-[6%]" },
  { label: "Reports", icon: FileBarChart, className: "bottom-[30%] right-[2%] sm:right-[6%]" },
  { label: "Announcements", icon: Bell, className: "top-[42%] left-[3%] hidden lg:block" },
  { label: "QR Code", icon: QrCode, className: "top-[42%] right-[3%] hidden lg:block" },
];

/* ------------------------------- sub components ---------------------------- */

function Counter({ value, suffix }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.floor(v)),
    });
    return () => controls.stop();
  }, [isInView, value]);

  return (
    <span ref={ref} className="text-4xl sm:text-5xl font-bold text-white">
      {display}
      {suffix}
    </span>
  );
}

function FloatingCard({ label, icon: Icon, className, delay }) {
  return (
    <motion.div
      className={`absolute hidden sm:flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/80 dark:bg-[#1e1e1e]/85 backdrop-blur-md shadow-lg shadow-pink-100 dark:shadow-black/30 ring-1 ring-pink-100 dark:ring-white/10 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay },
      }}
    >
      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center">
        <Icon size={16} className="text-white" />
      </span>
      <span className="text-xs font-medium text-[#2d2d2d] dark:text-gray-200 whitespace-nowrap">{label}</span>
    </motion.div>
  );
}

/* ------------------------------------ page ---------------------------------- */

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f] text-[#2d2d2d] dark:text-gray-100 overflow-x-hidden transition-colors duration-300">
      <Navbar />

      {/* ---------------- Hero ---------------- */}
      <section className="relative min-h-screen flex items-center justify-center pt-28 pb-16 px-5 bg-gradient-to-b from-[#fff1f6] via-white to-white dark:from-[#1a0f14] dark:via-[#0f0f0f] dark:to-[#0f0f0f]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,102,153,0.12),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,102,153,0.08),transparent_60%)]" />

        {/* Floating UI cards */}
        {floatingCards.map((c, i) => (
          <FloatingCard key={c.label} {...c} delay={i * 0.3} />
        ))}

        <div className="relative max-w-3xl mx-auto text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-center justify-center gap-5 sm:gap-8 mb-8"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 dark:bg-[#1e1e1e] backdrop-blur shadow-lg ring-1 ring-pink-100 dark:ring-white/10 flex items-center justify-center hover:scale-105 hover:shadow-pink-200 dark:hover:shadow-black/40 transition-all duration-300">
              <img src={osasLogo} alt="OSAS logo" className="w-11 h-11 sm:w-14 sm:h-14 object-contain" />
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-pink-500 via-pink-400 to-rose-400 bg-clip-text text-transparent"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              EvOSAS
            </motion.h1>

            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 dark:bg-[#1e1e1e] backdrop-blur shadow-lg ring-1 ring-pink-100 dark:ring-white/10 flex items-center justify-center hover:scale-105 hover:shadow-pink-200 dark:hover:shadow-black/40 transition-all duration-300">
              <img src={sscLogo} alt="SSC logo" className="w-11 h-11 sm:w-14 sm:h-14 object-contain" />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl font-medium text-[#ff6699] mb-4"
          >
            The Official Evolution of the Office of Student Affairs and Services
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-base sm:text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto"
          >
            EvOSAS is a centralized digital platform designed to modernize the Office
            of Student Affairs and Services by streamlining disciplinary records,
            student services, attendance monitoring, announcements, event
            evaluations, and lost-and-found management through one secure and
            efficient web application.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-pink-500 via-pink-400 to-rose-400 shadow-lg shadow-pink-200 hover:shadow-xl hover:shadow-pink-300 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Login <ArrowRight size={16} />
            </Link>
            <Link
              to="/about"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold text-[#2d2d2d] dark:text-white bg-white dark:bg-[#1e1e1e] ring-1 ring-gray-200 dark:ring-white/10 hover:ring-pink-300 dark:hover:ring-pink-400/40 hover:text-[#ff6699] transition-all duration-300"
            >
              Learn More
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="py-24 px-5 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-[#ff6699] bg-[#fff1f6] dark:bg-pink-400/10 dark:text-[#ff77aa] px-3 py-1.5 rounded-full mb-4">
              <Sparkles size={12} /> Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 dark:text-white">
              Everything OSAS needs, in one place
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              A complete suite of tools built for student affairs, discipline, and
              service management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="p-7 rounded-3xl bg-white dark:bg-[#1a1a1a] ring-1 ring-gray-100 dark:ring-white/10 shadow-sm dark:shadow-none hover:shadow-xl hover:shadow-pink-100 dark:hover:shadow-black/40 hover:ring-pink-100 dark:hover:ring-pink-400/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center mb-5 shadow-md shadow-pink-200 dark:shadow-pink-500/10">
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 dark:text-white">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- About Preview ---------------- */}
      <section className="py-24 px-5 bg-[#fff1f6]/50 dark:bg-[#161016]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-pink-500 via-pink-400 to-rose-400 shadow-2xl shadow-pink-200 dark:shadow-black/40 flex items-center justify-center overflow-hidden">
              <div className="grid grid-cols-2 gap-4 p-8 w-full">
                {[BookOpen, ShieldCheck, QrCode, Bell].map((Icon, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    <Icon size={32} className="text-white" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-5 dark:text-white">
              Built for Dominican College of Tarlac
            </h2>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
              EvOSAS centralizes student services for OSAS staff, SSC officers, and
              students alike — bringing discipline records, attendance, lost and
              found, and event evaluations into one secure, easy-to-use platform.
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-pink-500 via-pink-400 to-rose-400 shadow-md shadow-pink-200 dark:shadow-pink-500/10 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Learn More <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ---------------- How EvOSAS Works ---------------- */}
      <section className="py-24 px-5 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 dark:text-white">How EvOSAS Works</h2>
          <p className="text-gray-500 dark:text-gray-400">Five simple steps to get things done.</p>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-4 relative">
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-200 via-pink-300 to-rose-200 dark:from-pink-500/20 dark:via-pink-400/30 dark:to-rose-400/20" />
          {steps.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative flex flex-col items-center text-center z-10"
            >
              <div className="w-16 h-16 rounded-full bg-white dark:bg-[#1e1e1e] ring-4 ring-[#fff1f6] dark:ring-[#0f0f0f] shadow-md dark:shadow-black/30 flex items-center justify-center mb-4">
                <s.icon size={24} className="text-[#ff6699]" />
              </div>
              <p className="text-sm font-semibold text-[#2d2d2d] dark:text-gray-200">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- Statistics ---------------- */}
      <section className="py-24 px-5 bg-gradient-to-br from-[#2d2d2d] via-[#3a2b31] to-[#2d2d2d] dark:from-[#141414] dark:via-[#1f1418] dark:to-[#141414]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-10 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <Counter value={s.value} suffix={s.suffix} />
              <p className="mt-2 text-sm text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Why Choose EvOSAS ---------------- */}
      <section className="py-24 px-5 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 dark:text-white">Why Choose EvOSAS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {checklist.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white text-xs shrink-0">
                    ✓
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-1 lg:order-2 aspect-square rounded-3xl bg-gradient-to-br from-[#fff1f6] to-pink-50 dark:from-[#1a1216] dark:to-[#161016] ring-1 ring-pink-100 dark:ring-white/5 flex items-center justify-center"
          >
            <div className="w-24 h-24 rounded-full bg-white dark:bg-[#1e1e1e] shadow-lg dark:shadow-black/30 flex items-center justify-center">
              <img src={osasLogo} alt="OSAS logo" className="w-14 h-14 object-contain" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="relative py-28 px-5 overflow-hidden bg-gradient-to-r from-pink-500 via-pink-400 to-rose-400 dark:from-pink-600 dark:via-pink-500 dark:to-rose-500">
        <motion.div
          className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Experience the Evolution of Student Services?
          </h2>
          <p className="text-white/90 mb-9">
            Log in now to access discipline records, attendance, lost and found,
            and more — all in one secure platform.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-9 py-3.5 rounded-full text-sm font-semibold text-[#ff6699] bg-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            Login Now <ArrowRight size={16} />
          </Link>
        </div>
      </section>


    </div>
  );
}