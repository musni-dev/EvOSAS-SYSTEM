import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase/firebase";

import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, query, where, getDocs,} from "firebase/firestore";

const PROGRAMS = [
  "Bachelor of Arts in Political Science (B.A. Pol. Sci)",
  "Bachelor of Elementary Education (BEED)",
  "Bachelor of Secondary Education (BSED) English",
  "Bachelor of Secondary Education (BSED) Mathematics",
  "Bachelor of Science in Tourism Management (BSTM)",
  "Bachelor of Science in Hospitality Management (BSHM)",
  "Bachelor of Science in Information Technology (BSIT)",
  "Bachelor of Science in Business Administration (BSBA)",
  "Bachelor of Science in Accountancy (BSA)",
  "Bachelor of Science in Criminology (B.S. Crim.)",
];

export default function EvaluationFormPage() {
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // respondent info
  const [studentId, setStudentId] = useState("");
  const [program, setProgram] = useState("");
  const [yearSection, setYearSection] = useState("");
  const [name, setName] = useState("");

  // duplicate-check state (checked as soon as a full 9-digit ID is entered)
  const [checkingId, setCheckingId] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const ratings = [
    "5 Strongly Agree",
    "4 Agree",
    "3 Neutral",
    "2 Disagree",
    "1 Strongly Disagree",
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

  // 🔍 Early duplicate check: as soon as the Student ID is a full 9 digits,
  // check if this student already answered this event's form.
  useEffect(() => {
    const checkDuplicate = async () => {
      if (studentId.length !== 9) {
        setAlreadySubmitted(false);
        return;
      }

      try {
        setCheckingId(true);

        const q = query(
          collection(db, "evaluationResponses"),
          where("eventId", "==", eventId),
          where("studentId", "==", studentId)
        );

        const existing = await getDocs(q);
        setAlreadySubmitted(!existing.empty);
      } catch (err) {
        console.log(err);
      } finally {
        setCheckingId(false);
      }
    };

    checkDuplicate();
  }, [studentId, eventId]);

  const handleAnswer = (index, value) => {
    setAnswers((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  // Student ID: digits only, max 9 characters
  const handleStudentIdChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 9);
    setStudentId(digitsOnly);
  };

  // Year & Section: letters/numbers/dash only, max 4 characters (e.g. "4A", "4-A")
  const handleYearSectionChange = (e) => {
    const cleaned = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 4);
    setYearSection(cleaned);
  };

  // Name: letters, spaces, periods, and commas only (no numbers/other special characters)
  const handleNameChange = (e) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z .,]/g, "");
    setName(cleaned);
  };

  const submitEvaluation = async () => {
    try {
      if (!studentId || !program || !yearSection) {
        return alert("Please fill up required fields");
      }

      if (studentId.length !== 9) {
        return alert("Student ID must be exactly 9 digits.");
      }

      // ❌ DUPLICATE CHECK
      const q = query(
        collection(db, "evaluationResponses"),
        where("eventId", "==", eventId),
        where("studentId", "==", studentId)
      );

      const existing = await getDocs(q);

      if (!existing.empty) {
        setAlreadySubmitted(true);
        return alert("You already submitted this evaluation.");
      }


     // CHECK IF ALL QUESTIONS ARE ANSWERED
      if (Object.keys(answers).length !== event.questions.length) {
        return alert("Please answer all questions before submitting.");
      }

      setSubmitting(true);

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
            respondents: 0,
            aggregated: {},
          });
        }

const scoreMap = {
  "5 Strongly Agree": 5,
  "4 Agree": 4,
  "3 Neutral": 3,
  "2 Disagree": 2,
  "1 Strongly Disagree": 1,
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

        // Count one respondent per submission
        batchUpdate.respondents = increment(1);

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
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-500 text-sm">Loading evaluation form...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-500 text-sm">Event not found</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = event.questions.length;
  const progressPct = totalQuestions
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* TOP BANNER */}
      <div className="bg-gradient-to-br from-pink-600 to-rose-500 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-14">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/15 border border-white/25">
              Powered by EvOSAS
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold mt-4">{event.eventName}</h1>
          <p className="text-white/80 text-sm mt-1">{event.eventDate}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 space-y-5">

        {alreadySubmitted ? (
          /* BLOCKING MESSAGE FOR DUPLICATE STUDENT ID */
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              You already submitted this evaluation
            </h2>
            <p className="text-sm text-gray-500">
              This Student ID has already been used to evaluate this event.
              Only one response per student is allowed per event.
            </p>
          </div>
        ) : (
          <>
            {/* RESPONDENT INFO CARD */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7 space-y-4">
              <h2 className="text-base font-bold text-gray-800">Respondent Information</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Student ID *
                  </label>
                  <input
                    inputMode="numeric"
                    placeholder="9-digit Student ID"
                    value={studentId}
                    onChange={handleStudentIdChange}
                    maxLength={9}
                    className="mt-1.5 border border-gray-200 p-2.5 w-full rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                  />
                  {checkingId && (
                    <p className="text-[11px] text-gray-400 mt-1">Checking ID...</p>
                  )}
                  {studentId.length > 0 && studentId.length < 9 && (
                    <p className="text-[11px] text-amber-500 mt-1">
                      {9 - studentId.length} more digit(s) needed
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Program *
                  </label>
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="mt-1.5 border border-gray-200 p-2.5 w-full rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                  >
                    <option value="">Select Program</option>
                    {PROGRAMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Year & Section *
                  </label>
                  <input
                    placeholder="e.g. 4A"
                    value={yearSection}
                    onChange={handleYearSectionChange}
                    maxLength={4}
                    className="mt-1.5 border border-gray-200 p-2.5 w-full rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Max 4 characters</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name (Optional)
                  </label>
                  <input
                    placeholder="Juan Dela Cruz"
                    value={name}
                    onChange={handleNameChange}
                    className="mt-1.5 border border-gray-200 p-2.5 w-full rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* PROGRESS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                {answeredCount}/{totalQuestions} answered
              </span>
            </div>

            {/* QUESTIONS */}
            <div className="space-y-4">
              {event.questions.map((q, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
                >
                  <p className="font-semibold text-gray-800 mb-3">
                    {index + 1}. {q}
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    {ratings.map((r) => {
                      const active = answers[index] === r;
                      return (
                        <label
                          key={r}
                          className={`text-xs sm:text-sm px-3 py-2 rounded-xl border cursor-pointer transition-all duration-150 ${
                            active
                              ? "bg-pink-500 border-pink-500 text-white shadow-sm shadow-pink-500/30"
                              : "border-gray-200 text-gray-600 hover:border-pink-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${index}`}
                            value={r}
                            checked={active}
                            onChange={() => handleAnswer(index, r)}
                            className="hidden"
                          />
                          {r}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={submitEvaluation}
              disabled={submitting}
              className="w-full sm:w-auto mt-2 bg-gradient-to-r from-pink-600 to-rose-500 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-pink-500/30 transition-all duration-200 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Evaluation"}
            </button>
          </>
        )}

        <p className="text-center text-[11px] text-gray-400 pt-4">
          EvOSAS &mdash; Event Evaluation System
        </p>
      </div>
    </div>
  );
}