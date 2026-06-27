import { useState, useEffect } from "react";
import AddCaseModal from "../components/AddCaseModal";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function SDOAddCase() {
  const [showModal, setShowModal] = useState(false);
  const [cases, setCases] = useState([]);

  useEffect(() => {
    const fetchCases = async () => {
      const snap = await getDocs(collection(db, "cases"));
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    fetchCases();
  }, []);

  return (
    <div className="p-6">

      <button
        onClick={() => setShowModal(true)}
        className="bg-pink-500 text-white px-5 py-3 rounded-xl"
      >
        + Add Case
      </button>

      <AddCaseModal
        show={showModal}
        onClose={() => setShowModal(false)}
        cases={cases}
        setCases={setCases}
      />
    </div>
  );
}