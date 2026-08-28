import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { doc, onSnapshot, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function EvaluationResultsPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "evaluationResults", id), (snap) => {
      setResult(snap.data());
    });

    return () => unsub();
  }, [id]);

  // Fetch the event so we know how many questions each respondent answers.
  // This lets us derive respondents-per-section from the existing aggregated
  // totals without changing how data is written.
  useEffect(() => {
    const fetchEvent = async () => {
      const snap = await getDoc(doc(db, "evaluations", id));
      if (snap.exists()) setEvent(snap.data());
    };

    fetchEvent();
  }, [id]);

  const agg = result?.aggregated || {};
  const questionCount = event?.questions?.length || 0;

  const sections = Object.entries(agg)
    .map(([key, data]) => {
      const avg = data.total ? data.scoreSum / data.total : 0;
      const respondents = questionCount
        ? Math.round((data.total || 0) / questionCount)
        : 0;

      return {
        key,
        label: data.label || key,
        avg,
        respondents,
      };
    })
    .sort((a, b) => b.respondents - a.respondents);

  // REAL overall (weighted, not simple average)
  let totalScore = 0;
  let totalCount = 0;

  Object.values(agg).forEach((s) => {
    totalScore += s.scoreSum || 0;
    totalCount += s.total || 0;
  });

  const overall = totalCount ? (totalScore / totalCount).toFixed(2) : "0.0";
  const totalRespondents = result?.respondents || 0;

  const ratingLabel = (avg) => {
    if (avg >= 4.5) return { text: "Excellent", color: "text-emerald-600 bg-emerald-50" };
    if (avg >= 3.5) return { text: "Good", color: "text-pink-600 bg-pink-50" };
    if (avg >= 2.5) return { text: "Fair", color: "text-amber-600 bg-amber-50" };
    if (avg > 0) return { text: "Needs Improvement", color: "text-red-600 bg-red-50" };
    return { text: "No Data", color: "text-gray-400 bg-gray-50" };
  };

  const handleDownloadResults = () => {
  const headers = ["Section", "Respondents", "Average Rating", "Remarks"];
  const rows = sections.map((s) => {
    const rating = ratingLabel(s.avg);
    return [s.label, s.respondents, s.avg.toFixed(2), rating.text];
  });

  let csv = headers.join(",") + "\n";
  rows.forEach((r) => {
    csv += r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  csv += `\n"Overall Total (${totalRespondents} respondents)","","${overall}",""\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event?.eventName || "evaluation"}-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

  const handleDownloadSectionRespondents = async (sectionKey, sectionLabel) => {
    try {
      const q = query(
        collection(db, "evaluationResponses"),
        where("eventId", "==", id)
      );
      const snap = await getDocs(q);

      // "Section" = a respondent's program + yearSection, same way
      // EvaluationFormPage computes it when writing aggregated scores.
      const scoreMap = {
        "5 Strongly Agree": 5,
        "4 Agree": 4,
        "3 Neutral": 3,
        "2 Disagree": 2,
        "1 Strongly Disagree": 1,
      };

      const rows = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();

        const rawKey = `${data.program || ""} ${data.yearSection || ""}`.trim();
        const respondentSectionKey = rawKey.toLowerCase();

        if (respondentSectionKey !== sectionKey) return; // different section

        let totalScore = 0;
        let totalCount = 0;

        (event?.questions || []).forEach((_, index) => {
          const qType = (event?.questionTypes && event.questionTypes[index]) || "rating";
          if (qType !== "rating") return; // text answers don't contribute to the score

          const rating = data.answers?.[index];
          if (!rating) return;

          totalScore += scoreMap[rating] || 0;
          totalCount += 1;
        });

        const avg = totalCount ? (totalScore / totalCount).toFixed(2) : "0.00";

        // 🆕 each question's own answer, in order, alongside the overall average
        const perQuestionAnswers = (event?.questions || []).map((_, index) => {
          const ans = data.answers?.[index];
          return ans === undefined || ans === null || ans === "" ? "—" : ans;
        });

        rows.push([
          data.studentId || "N/A",
          data.name || "N/A",
          ...perQuestionAnswers,
          avg,
        ]);
      });

      if (rows.length === 0) {
        alert("No respondents found for this section.");
        return;
      }

      // 🆕 headers now list every question, so each answer has its own column
      const headers = [
        "Student ID",
        "Name",
        ...(event?.questions || []).map((qText, i) => `Q${i + 1}: ${qText}`),
        `${sectionLabel} Score`,
      ];
      let csv = headers.join(",") + "\n";
      rows.forEach((r) => {
        csv += r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event?.eventName || "evaluation"}-${sectionLabel}-respondents.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error fetching section respondents:", err);
      alert("Failed to load respondents. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* TOP BANNER */}
      <div className="bg-gradient-to-br from-pink-600 to-rose-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-14">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/15 border border-white/25">
            Powered by EvOSAS
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold mt-4">
            {event?.eventName || "Event Results"}
          </h1>
          <p className="text-white/80 text-sm mt-1">{event?.eventDate}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-5">

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total Respondents
            </p>
            <h2 className="text-3xl font-bold text-gray-800 mt-2">{totalRespondents}</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Sections Reporting
            </p>
            <h2 className="text-3xl font-bold text-gray-800 mt-2">{sections.length}</h2>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-pink-600 to-rose-500 rounded-2xl shadow-xl p-5 text-white">
            <p className="text-xs font-medium text-white/80 uppercase tracking-wider">
              Overall Rating
            </p>
            <h2 className="text-3xl font-bold mt-2">{overall}</h2>
          </div>
        </div>

        {/* PER-SECTION BREAKDOWN */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-7">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Results per Section</h2>
            <button
              onClick={handleDownloadResults}
              className="px-4 py-2 bg-pink-600 text-white text-xs font-medium rounded-xl shadow-sm transition-all duration-200 hover:bg-pink-700 active:scale-[0.98]"
            >
              Download Results
            </button>
          </div>

          {sections.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No responses yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sections.map((s) => {
                const rating = ratingLabel(s.avg);
                return (
                  <div
                    key={s.key}
                    className="border border-gray-100 rounded-2xl p-4 hover:border-pink-200 transition-colors duration-150"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{s.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.respondents} respondent{s.respondents === 1 ? "" : "s"}
                        </p>
                        <button
                          onClick={() => handleDownloadSectionRespondents(s.key, s.label)}
                          className="text-[11px] font-medium text-pink-600 hover:text-pink-700 hover:underline mt-1"
                        >
                          Download Respondents Results
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${rating.color}`}
                        >
                          {rating.text}
                        </span>
                        <span className="text-xl font-bold text-pink-600">
                          {s.avg.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* mini progress bar out of 5 */}
                    <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-500"
                        style={{ width: `${(s.avg / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Overall Total ({totalRespondents} respondents)</p>
            <p className="text-3xl font-bold text-pink-600">{overall}</p>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 pt-2">
          EvOSAS &mdash; Event Evaluation System
        </p>
      </div>
    </div>
  );
}