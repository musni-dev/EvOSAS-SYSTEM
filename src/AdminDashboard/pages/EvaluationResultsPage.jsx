import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function EvaluationResultsPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "evaluationResults", id), (snap) => {
      setResult(snap.data());
    });

    return () => unsub();
  }, [id]);

  const agg = result?.aggregated || {};

  const sections = Object.entries(agg).map(([section, data]) => {
    const avg = data.total ? data.scoreSum / data.total : 0;

    return {
      section,
      avg,
    };
  });

  // REAL overall (weighted, not simple average)
  let totalScore = 0;
  let totalCount = 0;

  Object.values(agg).forEach((s) => {
    totalScore += s.scoreSum || 0;
    totalCount += s.total || 0;
  });

  const overall = totalCount ? (totalScore / totalCount).toFixed(2) : "0.0";

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        CCS Event Results
      </h1>

      <div className="bg-white p-5 rounded-xl shadow border space-y-3">

        {sections.map((s) => (
          <div key={s.section} className="flex justify-between border-b py-2">
            <span className="font-medium">{s.section}</span>
            <span className="font-bold text-pink-600">
              {s.avg.toFixed(2)}
            </span>
          </div>
        ))}

        <div className="pt-4 text-right">
          <p className="text-gray-500">Overall Total</p>
          <p className="text-3xl font-bold text-pink-600">
            {overall}
          </p>
        </div>

      </div>
    </div>
  );
}