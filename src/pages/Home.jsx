import { useEffect } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import QuickCard from "../components/QuickCard";
import DCTbg from "../assets/dct.png";
import OSASlogo from "../assets/osas-logo.png";
import SSClogo from "../assets/ssc-logo.png";
import { motion } from "framer-motion";

const Home = () => {

useEffect(() => {
  api.get("/api/announcements")
    .then(res => {
      console.log("ANNOUNCEMENTS:", res.data);
    })
    .catch(err => {
      console.log(err.message);
    });
}, []);

  return (
    <>
      {/* HERO SECTION */}
      <section
        className="relative py-24 text-white text-center"
        style={{
          backgroundImage: `url(${DCTbg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Pink overlay */}
       

        {/* Hero content */}
        <motion.div
          className="relative z-10 px-4 flex flex-col md:flex-row items-center justify-center gap-6"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          {/* Left logo */}
          <motion.img
            src={OSASlogo}
            alt="OSAS Logo"
            className="h-16 w-16 md:h-60 md:w-60 object-contain"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />

          {/* Center text */}
          <motion.div
            className="text-center md:text-center max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <h1 className="text-black md:text-5xl font-black mb-4 drop-shadow-lg">
              The Official Evolution of the Office of Student Affairs and Services.
            </h1>
            <p className="text-black md:text-xl mb-6 drop-shadow">
              Centralized student services, reports, announcements, and evaluations.
            </p>

            <div className="flex justify-center gap-4">
              <Link
                to="/about"
                className="bg-[#ff6699] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#ff77aa] transition"
              >
                About Us
              </Link>

              <Link
                to="/announcements"
                className="border-2 border-black text-black px-6 py-3 rounded-lg font-bold hover:bg-black hover:text-[#ff6699] transition"
              >
                Announcements
              </Link>
            </div>
          </motion.div>

          {/* Right logo */}
          <motion.img
            src={SSClogo}
            alt="SSC Logo"
            className="h-16 w-16 md:h-60 md:w-60 object-contain"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          />
        </motion.div>
      </section>

        {/* VISION, MISSION & OBJECTIVES SECTION */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-5xl mx-auto px-4 space-y-12">
            {/* Vision */}
            <div>
              <h2 className="text-3xl font-bold text-[#ff6699] mb-4">Vision</h2>
              <p className="text-gray-700 text-lg md:text-xl">
                Guided by the DCT’s ideals, the Office of the Student Affairs and Services (OSAS) envisions itself to be an integral part of the Institution in the holistic formation and development of the Dominican students.
              </p>
            </div>

            {/* Mission */}
            <div>
              <h2 className="text-3xl font-bold text-[#ff6699] mb-4">Mission</h2>
              <p className="text-gray-700 text-lg md:text-xl">
                The Office of the Student Affairs and Services (OSAS) is committed in the enhancement and provision of Student Welfare and Development Programs and Services responsive and sensitive to the changing needs of the students.
              </p>
            </div>

            {/* Objectives */}
            <div>
              <h2 className="text-3xl font-bold text-[#ff6699] mb-4">Objectives</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 text-lg md:text-xl text-justify">
                <li>To provide and develop the student programs and services data-driven and relevant to students’ changing needs through the use of standard assessment and evaluation mechanism.</li>
                <li>To help students utilize their potentials to the fullest and plan their future in accordance to their abilities, interest and needs through necessary interventions and guidance programs. (Guidance & Counseling Office)</li>
                <li>To reinforce the overall academic program of the Institution by providing efficient and effective learning support services. (Research Learning Center)</li>
                <li>To train students become leaders and agents of change for development by providing them with opportunities for active involvement in co-curricular and extra-curricular activities. (Student Organization)</li>
                <li>To maintain and improve health and living conditions of the students through coordination and supervision of policies relative to health services. (Health Service)</li>
                <li>To establish a peaceful and harmonious environment through consistent, prompt and just implementation of the policies on student discipline and mediation in student conflicts. (Discipline Office)</li>
                <li>To create and establish a feeling of safety and security for all through active delivery of skillful quality law enforcement service.</li>
                <li>To ensure full educational and community use by overseeing the maintenance of the physical school facilities and grounds in a condition of operating excellence, cleanliness and safety.</li>
              </ul>
            </div>
          </div>
        </section>
    </>
  );
};

export default Home;