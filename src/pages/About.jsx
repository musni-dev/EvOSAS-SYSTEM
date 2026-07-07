import { motion } from "framer-motion";
import {
  Target,
  Compass,
  ListChecks,
  Users,
  ShieldCheck,
  Heart,
  BookOpen,
  Building2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import osasLogo from "../assets/osas-logo.png";
import sscLogo from "../assets/ssc-logo.png";

const osasObjectives = [
  "Provide student programs and services data-driven and relevant to students' changing needs.",
  "Help students utilize their potentials to the fullest through guidance programs.",
  "Reinforce academic program through learning support services.",
  "Train students to become leaders and agents of change.",
  "Maintain and improve student health and living conditions.",
  "Ensure peaceful and harmonious student environment.",
  "Deliver quality law enforcement and safety services.",
  "Oversee maintenance of school facilities for safe use.",
];

const sscObjectives = [
  {
    text: "To provide and develop the student programs and services data-driven and relevant to students' changing needs through the use of standard assessment and evaluation mechanism.",
  },
  {
    text: "To help students utilize their potentials to the fullest and plan their future in accordance to their abilities, interest and needs through necessary interventions and guidance programs.",
    tag: "Guidance & Counseling Office",
  },
  {
    text: "To reinforce the overall academic program of the Institution by providing efficient and effective learning support services.",
    tag: "Research Learning Center",
  },
  {
    text: "To train students become leaders and agents of change for development by providing them with opportunities for active involvement in co-curricular and extra-curricular activities.",
    tag: "Student Organization",
  },
  {
    text: "To maintain and improve health and living conditions of the students through coordination and supervision of policies relative to health services.",
    tag: "Health Service",
  },
  {
    text: "To establish a peaceful and harmonious environment through consistent, prompt and just implementation of the policies on student discipline and mediation in student conflicts.",
    tag: "Discipline Office",
  },
  {
    text: "To create and establish a feeling of safety and security for all through active delivery of skillful quality law enforcement service.",
  },
  {
    text: "To ensure full educational and community use by overseeing the maintenance of the physical school facilities and grounds in a condition of operating excellence, cleanliness and safety.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-14">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-[#ff6699] dark:text-[#ff77aa] bg-[#fff1f6] dark:bg-pink-400/10 px-3 py-1.5 rounded-full mb-4">
        {eyebrow}
      </span>
      <h2 className="text-3xl sm:text-4xl font-bold mb-4 dark:text-white">{title}</h2>
      {subtitle && <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function VisionMissionCard({ icon: Icon, title, text }) {
  return (
    <motion.div
      variants={fadeUp}
      className="p-8 rounded-3xl bg-white dark:bg-[#1a1a1a] ring-1 ring-gray-100 dark:ring-white/10 shadow-sm dark:shadow-none hover:shadow-xl hover:shadow-pink-100 dark:hover:shadow-black/40 hover:ring-pink-100 dark:hover:ring-pink-400/30 transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center mb-5 shadow-md shadow-pink-200 dark:shadow-pink-500/10">
        <Icon size={22} className="text-white" />
      </div>
      <h3 className="font-semibold text-lg mb-3 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{text}</p>
    </motion.div>
  );
}

export default function About() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f] text-[#2d2d2d] dark:text-gray-100 overflow-x-hidden transition-colors duration-300">
      <Navbar />

      {/* ---------------- Hero ---------------- */}
      <section className="relative pt-36 pb-20 px-5 bg-gradient-to-b from-[#fff1f6] via-white to-white dark:from-[#1a0f14] dark:via-[#0f0f0f] dark:to-[#0f0f0f] text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,102,153,0.12),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,102,153,0.08),transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-center justify-center gap-6 mb-8"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 dark:bg-[#1e1e1e] shadow-lg ring-1 ring-pink-100 dark:ring-white/10 flex items-center justify-center">
              <img src={osasLogo} alt="OSAS logo" className="w-11 h-11 object-contain" />
            </div>
            <div className="w-16 h-16 rounded-full bg-white/90 dark:bg-[#1e1e1e] shadow-lg ring-1 ring-pink-100 dark:ring-white/10 flex items-center justify-center">
              <img src={sscLogo} alt="SSC logo" className="w-11 h-11 object-contain" />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold mb-5 dark:text-white"
          >
            About{" "}
            <span className="bg-gradient-to-r from-pink-500 via-pink-400 to-rose-400 bg-clip-text text-transparent">
              OSAS
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-gray-500 dark:text-gray-400 leading-relaxed"
          >
            The Dominican College of Tarlac Office of Student Affairs and Services
            (OSAS) is an administrative unit of the Institution under the supervision
            of the Administrator. It develops and implements student-centered
            programs that complement the academic program to support holistic
            student development.
          </motion.p>
        </div>
      </section>

      {/* ---------------- What is EvOSAS ---------------- */}
      <section className="py-20 px-5 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-pink-500 via-pink-400 to-rose-400 shadow-2xl shadow-pink-200 dark:shadow-black/40 flex items-center justify-center"
          >
            <BookOpen size={72} className="text-white/90" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-[#ff6699] dark:text-[#ff77aa] bg-[#fff1f6] dark:bg-pink-400/10 px-3 py-1.5 rounded-full mb-4">
              What is EvOSAS?
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-5 dark:text-white">
              A centralized platform for student services
            </h2>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              EvOSAS is the Evolution of the Office of Student Affairs and Services,
              a web-based management system developed to centralize student services
              at the Dominican College of Tarlac. It allows students, OSAS staff, and
              SSC officers to manage reports, disciplinary cases, lost-and-found
              items, SSC attendance monitoring, event evaluations, and student
              organization files — all in one seamless platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---------------- OSAS Vision / Mission ---------------- */}
      <section className="py-20 px-5 bg-[#fff1f6]/50 dark:bg-[#161016]">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Office of Student Affairs and Services" title="OSAS Vision &amp; Mission" />
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            transition={{ staggerChildren: 0.12 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12"
          >
            <VisionMissionCard
              icon={Compass}
              title="Vision"
              text="Guided by the DCT's ideals, OSAS envisions itself to be an integral part of the Institution in the holistic formation and development of the Dominican students."
            />
            <VisionMissionCard
              icon={Target}
              title="Mission"
              text="OSAS is committed to the enhancement and provision of student welfare and development programs and services, responsive and sensitive to the changing needs of the students."
            />
          </motion.div>

          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#1a1a1a] ring-1 ring-gray-100 dark:ring-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center">
                <ListChecks size={18} className="text-white" />
              </div>
              <h3 className="font-semibold text-lg dark:text-white">Objectives</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {osasObjectives.map((obj) => (
                <div key={obj} className="flex items-start gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{obj}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SSC Section ---------------- */}
      <section className="py-20 px-5 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Supreme Student Council"
            title="SSC"
            subtitle="The SSC is composed of students of the Dominican College of Tarlac. Believing in the need for a better organized College Department Supreme Student Council and in the development of the youth as future leaders of the nation, the SSC hereby promulgates and adopts this Constitution and By-Laws. It advances, implements, and maintains the goals and aspirations, embodies the ideas and principles, and promotes the welfare of all students and the academic standards of the Alma Mater, with a passion for truth and compassion for humanity."
          />

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            transition={{ staggerChildren: 0.12 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12"
          >
            <VisionMissionCard
              icon={Compass}
              title="Vision"
              text="Guided by the DCT's ideals, the Office of the Student Affairs and Services (OSAS) envisions itself to be an integral part of the Institution in the holistic formation and development of the Dominican students."
            />
            <VisionMissionCard
              icon={Target}
              title="Mission"
              text="The Office of the Student Affairs and Services (OSAS) is committed in the enhancement and provision of Student Welfare and Development Programs and Services responsive and sensitive to the changing needs of the students."
            />
          </motion.div>

          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#1a1a1a] ring-1 ring-gray-100 dark:ring-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center">
                <ListChecks size={18} className="text-white" />
              </div>
              <h3 className="font-semibold text-lg dark:text-white">Objectives</h3>
            </div>
            <div className="space-y-5">
              {sscObjectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {obj.text}
                    {obj.tag && (
                      <span className="ml-2 inline-block text-xs font-medium text-[#ff6699] dark:text-[#ff77aa] bg-[#fff1f6] dark:bg-pink-400/10 px-2 py-0.5 rounded-full align-middle">
                        {obj.tag}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Location strip ---------------- */}
      <section className="py-16 px-5 bg-[#2d2d2d] dark:bg-[#111111]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-[#ff77aa]" />
          </div>
          <p className="text-gray-300 text-sm">
            <span className="text-white font-semibold">Dominican College of Tarlac</span>
            <br />
            Office of Student Affairs and Services
          </p>
        </div>
      </section>


    </div>
  );
}