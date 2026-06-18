import React from "react";
import { motion } from "framer-motion";
import DCTbg from "../assets/dct.png";
import OSASlogo from "../assets/osas-logo.png";
import SSClogo from "../assets/ssc-logo.png";

const About = () => {
  return (
    <div className="flex flex-col overflow-hidden">

      {/* HERO SECTION */}
      <section
        className="relative py-16 sm:py-20 md:py-24 text-center text-white"
        style={{
          backgroundImage: `url(${DCTbg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#ff6699]/30"></div>

        <motion.div
          className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 px-4"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          {/* OSAS LOGO */}
          <motion.img
            src={OSASlogo}
            alt="OSAS Logo"
            className="h-20 w-20 sm:h-28 sm:w-28 md:h-48 md:w-48 object-contain"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />

          {/* TEXT */}
          <motion.div
            className="max-w-xs sm:max-w-md md:max-w-2xl text-center md:text-left px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black mb-4 drop-shadow-lg text-black leading-tight">
              About OSAS
            </h1>

            <p className="text-black text-sm sm:text-base md:text-lg drop-shadow text-justify">
              The Dominican College of Tarlac Office of Student Affairs and Services
              (OSAS) is an administrative unit of the Institution under the supervision
              of the Administrator. It develops and implements student-centered programs
              that complement the academic program to support holistic student development.
            </p>
          </motion.div>

          {/* SSC LOGO */}
          <motion.img
            src={SSClogo}
            alt="SSC Logo"
            className="h-20 w-20 sm:h-28 sm:w-28 md:h-48 md:w-48 object-contain"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          />
        </motion.div>
      </section>

      {/* WHAT IS EVOSAS */}
      <section className="bg-[#ff77aa]/10 py-12 sm:py-14 md:py-16">
        <motion.div
          className="max-w-5xl mx-auto px-4 text-center space-y-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[#ff6699]">
            What is EvOSAS?
          </h2>

          <p className="text-gray-800 text-sm sm:text-base md:text-xl text-justify">
            EvOSAS is the <strong>Evolution of the Office of Student Affairs and Services</strong>,
            a web-based management system developed to centralize student services at
            the Dominican College of Tarlac. It allows students, OSAS staff, and SSC officers
            to manage reports, announcements, disciplinary cases, lost and found items,
            attendance tracking, and event evaluations, all in one seamless platform.
          </p>
        </motion.div>
      </section>

      {/* VISION / MISSION / OBJECTIVES */}
      <section className="bg-white py-12 sm:py-14 md:py-16">
        <div className="max-w-5xl mx-auto px-4 space-y-10 md:space-y-12">

          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-[#ff6699] mb-4">
              Vision
            </h2>

            <p className="text-gray-700 text-sm sm:text-base md:text-xl text-justify">
              Guided by the DCT’s ideals, OSAS envisions itself to be an integral part of the Institution
              in the holistic formation and development of the Dominican students.
            </p>
          </motion.div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-[#ff6699] mb-4">
              Mission
            </h2>

            <p className="text-gray-700 text-sm sm:text-base md:text-xl text-justify">
              OSAS is committed to the enhancement and provision of student welfare and development programs
              and services, responsive and sensitive to the changing needs of the students.
            </p>
          </motion.div>

          {/* Objectives */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-[#ff6699] mb-4">
              Objectives
            </h2>

            <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm sm:text-base md:text-xl text-justify">
              <li>Provide student programs and services data-driven and relevant to students’ changing needs.</li>
              <li>Help students utilize their potentials to the fullest through guidance programs.</li>
              <li>Reinforce academic program through learning support services.</li>
              <li>Train students to become leaders and agents of change.</li>
              <li>Maintain and improve student health and living conditions.</li>
              <li>Ensure peaceful and harmonious student environment.</li>
              <li>Deliver quality law enforcement and safety services.</li>
              <li>Oversee maintenance of school facilities for safe use.</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* SSC */}
      <section className="bg-[#ff77aa]/10 py-12 sm:py-14 md:py-16">
        <motion.div
          className="max-w-5xl mx-auto px-4 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[#ff6699] mb-4">
            Supreme Student Council (SSC)
          </h2>

          <p className="text-gray-800 text-sm sm:text-base md:text-xl text-justify">
            The SSC is composed of students of the Dominican College of Tarlac. Believing in the need
            for a better organized College Department Supreme Student Council and in the development
            of the youth as future leaders of the nation, the SSC hereby promulgates and adopts this
            Constitution and By–Laws. It advances, implements, and maintains the goals and aspirations,
            embodies the ideas and principles, and promotes the welfare of all students and the academic
            standards of the Alma Mater, with a passion for truth and compassion for humanity.
          </p>
        </motion.div>
      </section>

    </div>
  );
};

export default About;