import { useState, useEffect } from "react";
import AddCaseModal from "../components/AddCaseModal";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

export default function SDOAddCase() {
  const [showModal, setShowModal] = useState(false);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "cases"));
      setCases(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };

    fetchCases();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Disciplinary cases
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-500 mt-0.5">
            {loading ? "Loading records\u2026" : `${cases.length} case${cases.length === 1 ? "" : "s"} on file`}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium
            hover:bg-pink-700 active:scale-[0.98] transition-all duration-150 shadow-sm shadow-pink-600/30 w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add case
        </button>
      </div>

      {/* CONTENT PLACEHOLDER — table/list of `cases` is rendered by CaseRecords elsewhere;
          this page is kept minimal and focused on the add-case entry point. */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 animate-pulse"
            />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            No cases yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-neutral-500 max-w-sm mb-5">
            Cases you add will show up here. Start by adding the first record.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add case
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4
                shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {c.title || c.studentName || `Case ${c.id.slice(0, 6)}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1 line-clamp-2">
                {c.description || "No description provided."}
              </p>
              {c.status && (
                <span
                  className={`inline-block mt-3 px-2.5 py-1 rounded-full text-[11px] font-medium
                    ${
                      c.status === "Declined"
                        ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                        : c.status === "in-progress"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    }`}
                >
                  {c.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <AddCaseModal
        show={showModal}
        onClose={() => setShowModal(false)}
        cases={cases}
        setCases={setCases}
      />
    </div>
  );
}