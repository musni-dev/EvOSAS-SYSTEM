import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase/firebase";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export default function EvaluationFormPage() {
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  // respondent info
  const [studentId, setStudentId] = useState("");
  const [program, setProgram] = useState("");
  const [yearSection, setYearSection] = useState("");
  const [name, setName] = useState("");

  const ratings = [
    "Strongly Agree",
    "Agree",
    "Neutral",
    "Disagree",
    "Strongly Disagree",
  ];

  useEffect(() => {
    const fetchEvent = async () => {
      const ref = doc(db, "evaluations", eventId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setEvent({ id: snap.id, ...snap.data() });
      }

      setLoading(false);
    };

    fetchEvent();
  }, [eventId]);

  const handleAnswer = (index, value) => {
    setAnswers((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const submitEvaluation = async () => {
    try {
      if (!studentId || !program || !yearSection) {
        return alert("Please fill up required fields");
      }

      // ❌ DUPLICATE CHECK
      const q = query(
        collection(db, "evaluationResponses"),
        where("eventId", "==", eventId),
        where("studentId", "==", studentId)
      );

      const existing = await getDocs(q);

      if (!existing.empty) {
        return alert("You already submitted this evaluation.");
      }

      // SAVE RESPONSE
      await setDoc(doc(collection(db, "evaluationResponses")), {
        eventId,
        studentId,
        program,
        yearSection,
        name: name || "",
        answers,
        createdAt: serverTimestamp(),
      });

      // INIT RESULT DOC
      const ref = doc(db, "evaluationResults", eventId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          evaluationId: eventId,
          aggregated: {},
        });
      }

      // SCORE MAP
      const scoreMap = {
        "Strongly Agree": 5,
        Agree: 4,
        Neutral: 3,
        Disagree: 2,
        "Strongly Disagree": 1,
      };

      // 🔥 NORMALIZED SECTION KEY (CASE INSENSITIVE FIX)
      const rawSectionKey = `${program} ${yearSection}`.trim();
      const sectionKey = rawSectionKey.toLowerCase();

      const batchUpdate = {};

      let totalScore = 0;
      let totalCount = 0;

      event.questions.forEach((q, index) => {
        const rating = answers[index];
        if (!rating) return;

        totalScore += scoreMap[rating] || 0;
        totalCount += 1;
      });

      batchUpdate[`aggregated.${sectionKey}.total`] = increment(totalCount);
      batchUpdate[`aggregated.${sectionKey}.scoreSum`] = increment(totalScore);
      batchUpdate[`aggregated.${sectionKey}.label`] = rawSectionKey;

      await updateDoc(ref, batchUpdate);

      alert("Submitted successfully!");

      // RESET
      setAnswers({});
      setStudentId("");
      setProgram("");
      setYearSection("");
      setName("");
    } catch (err) {
      console.log(err);
      alert(err.message);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!event) return <p className="p-6">Event not found</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">

      <h1 className="text-2xl font-bold">{event.eventName}</h1>
      <p className="text-gray-500 mb-6">{event.eventDate}</p>

      {/* RESPONDENT INFO */}
      <div className="border p-4 rounded-xl mb-6 space-y-3">

        <input
          placeholder="Student ID *"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="border p-2 w-full rounded"
        />

        <input
          placeholder="Program (e.g. CCS / BSIT) *"
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className="border p-2 w-full rounded"
        />

        <input
          placeholder="Year & Section (e.g. 4-A) *"
          value={yearSection}
          onChange={(e) => setYearSection(e.target.value)}
          className="border p-2 w-full rounded"
        />

        <input
          placeholder="Name (Optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full rounded"
        />
      </div>

      {/* QUESTIONS */}
      <div className="space-y-5">
        {event.questions.map((q, index) => (
          <div key={index} className="border p-4 rounded-xl">

            <p className="font-medium mb-3">
              {index + 1}. {q}
            </p>

            <div className="flex flex-wrap gap-4">
              {ratings.map((r) => (
                <label key={r} className="text-sm">
                  <input
                    type="radio"
                    name={`q-${index}`}
                    value={r}
                    onChange={() => handleAnswer(index, r)}
                  />{" "}
                  {r}
                </label>
              ))}
            </div>

          </div>
        ))}
      </div>

      <button
        onClick={submitEvaluation}
        className="mt-6 bg-pink-500 text-white px-6 py-3 rounded-xl"
      >
        Submit Evaluation
      </button>
    </div>
  );
}