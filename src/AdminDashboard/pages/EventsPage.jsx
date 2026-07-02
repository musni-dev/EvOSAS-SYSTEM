import { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { db } from "../../firebase/firebase";
import { collection,  query, where,getDocs, addDoc, Timestamp, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { FaTrash, FaClipboardCheck, FaQrcode, FaChartBar,} from "react-icons/fa";
import html2canvas from "html2canvas";

export default function EventsPage({ darkMode }) {
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");

  const [evaluations, setEvaluations] = useState([]);
  const [results, setResults] = useState([]);

  const [qrLink, setQrLink] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [saving, setSaving] = useState(false);
  const qrRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [questions, setQuestions] = useState([
    "The event was well organized.",
    "Overall, I am satisfied with this event.",
  ]);

  const ratings = [
    "5 Strongly Agree",
    "4 Agree",
    "3 Neutral",
    "2 Disagree",
    "1 Strongly Disagree",
  ];

  const handleQuestionChange = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([...questions, `New Question ${questions.length + 1}`]);
  };

  const deleteQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    if (editingIndex === index) setEditingIndex(null);
  };

  // SAVE FORM
  const saveEvaluation = async () => {
    try {
      if (!eventName.trim()) return alert("Enter event name");
      if (!eventDate) return alert("Select event date");

      setSaving(true);

      const docRef = await addDoc(collection(db, "evaluations"), {
        eventName,
        eventDate,
        questions,
        createdAt: Timestamp.now(),
        status: "Active",
      });

      const link = `${window.location.origin}/evaluation/${docRef.id}`;
      setQrLink(link);
      setShowQR(true);

      alert("Evaluation Created Successfully");
      resetForm();
      setShowForm(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const [qrType, setQrType] = useState("form");

const handleViewQR = (ev) => {
  const link = `${window.location.origin}/evaluation/${ev.id}`;

  setQrType("form");
  setSelectedEvent(ev);
  setQrLink(link);
  setShowQR(true);
};

const handleDelete = async (id) => {
  if (!window.confirm("Delete this evaluation and all responses?")) return;

  try {
    // Delete evaluationResults
    const resultsQuery = query(
      collection(db, "evaluationResults"),
      where("evaluationId", "==", id)
    );

    const resultsSnap = await getDocs(resultsQuery);

    for (const document of resultsSnap.docs) {
      await deleteDoc(doc(db, "evaluationResults", document.id));
    }

    // Delete evaluationResponses
const responsesQuery = query(
  collection(db, "evaluationResponses"),
  where("eventId", "==", id)
);

    const responsesSnap = await getDocs(responsesQuery);

    for (const document of responsesSnap.docs) {
      await deleteDoc(doc(db, "evaluationResponses", document.id));
    }

    // Delete evaluation
    await deleteDoc(doc(db, "evaluations", id));

    alert("Evaluation and all responses deleted successfully.");
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

  // FETCH EVALUATIONS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "evaluations"), (snap) => {
      setEvaluations(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  // FETCH RESULTS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "evaluationResults"), (snap) => {
      setResults(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  // =========================
  // 🔥 PER SECTION ANALYTICS
  // =========================
  const sectionStats = {};

  results.forEach((res) => {
    const agg = res.aggregated || {};

    Object.entries(agg).forEach(([section, data]) => {
      if (!sectionStats[section]) {
        sectionStats[section] = { total: 0, scoreSum: 0 };
      }

      sectionStats[section].total += data.total || 0;
      sectionStats[section].scoreSum += data.scoreSum || 0;
    });
  });

  const getAvg = (section) => {
    const s = sectionStats[section];
    if (!s || s.total === 0) return "0.0";
    return (s.scoreSum / s.total).toFixed(2);
  };

  const resetForm = () => {
  setEventName("");
  setEventDate("");

  setQuestions([
    "The event was well organized.",
    "Overall, I am satisfied with this event.",
  ]);

  setEditingIndex(null);
};

  const getToday = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60 * 1000)
    .toISOString()
    .split("T")[0];
};

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col space-y-6 p-4 sm:p-5 lg:p-6 ${
        darkMode ? "bg-slate-950" : "bg-slate-50"
      }`}
    >
       <div className="flex-1 overflow-y-auto space-y-6 pr-1">

      {/* HEADER */}
      <div
        className={`backdrop-blur-xl rounded-3xl p-5 sm:p-7 lg:p-8 shadow-sm border ${
          darkMode ? "bg-slate-900/70 border-slate-700" : "bg-white/70 border-white/60"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              Event Evaluation Management
            </h1>

            <p className={`mt-2 text-sm sm:text-base ${darkMode ? "text-slate-300" : "text-gray-500"}`}>
              Create evaluation forms, generate QR codes, and analyze feedback.
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-3 rounded-xl bg-pink-500 text-white font-medium shadow-sm shadow-pink-500/30 hover:bg-pink-600 transition w-full md:w-auto"
          >
            Create Evaluation Form
          </button>

        </div>
      </div>

  {/* STATS + SEARCH */}
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

  {/* STATS */}
  <div className="w-full md:w-72">
    <div className="relative overflow-hidden bg-gradient-to-br from-pink-600 to-rose-500 text-white rounded-3xl p-6 shadow-lg shadow-pink-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-0.5">
      <p className="text-white text-xs font-medium uppercase tracking-wider">
        Total Evaluations
      </p>

      <h2 className="text-3xl font-bold mt-2">
        {evaluations.length}
      </h2>
    </div>
  </div>



</div>

 

     {/* FORM MODAL */}
{showForm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">

    {/* MODAL BOX */}
    <div
      className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6 lg:p-7 shadow-2xl border ${
        darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
      }`}
    >


      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className={`text-xl sm:text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
          Event Evaluation Form
        </h2>

        <button
          onClick={addQuestion}
          className="px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-xl shadow-sm transition-all duration-200 hover:bg-emerald-600 active:scale-[0.98] w-full sm:w-auto"
        >
          + Add Question
        </button>
      </div>

      {/* EVENT DETAILS */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <input
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="Event Name"
          className={`border p-3 rounded-xl w-full text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent ${
            darkMode
              ? "border-pink-500 bg-slate-800 text-white placeholder-slate-400"
              : "border-pink-600 placeholder:text-gray-400"
          }`}
        />

        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
           min={getToday()}
          className={`border p-3 rounded-xl w-full text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent ${
            darkMode ? "border-pink-500 bg-slate-800 text-slate-200" : "border-pink-600 text-gray-600"
          }`}
        />
      </div>

      {/* QUESTIONS */}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div
            key={i}
            className={`border p-4 rounded-2xl transition-colors duration-200 ${
              darkMode
                ? "border-slate-700 bg-slate-800/60 hover:border-pink-500/50"
                : "border-gray-200 bg-gray-50 hover:border-pink-200"
            }`}
          >

            <input
              value={q}
              onChange={(e) => handleQuestionChange(i, e.target.value)}
              className={`border p-2.5 w-full rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent ${
                darkMode ? "border-pink-500 bg-slate-900 text-white" : "border-pink-600 bg-white"
              }`}
            />

            <button
              onClick={() => deleteQuestion(i)}
              className= " px-3 py-1.5 bg-red-600 text-white text-xs font-medium mt-3 rounded-lg transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
            >
              Delete Question
            </button>

            <div className="flex gap-4 flex-wrap mt-3">
              {ratings.map((r) => (
                <label
                  key={r}
                  className={`text-xs sm:text-sm flex items-center gap-1.5 ${
                    darkMode ? "text-slate-300" : "text-gray-600"
                  }`}
                >
                  <input type="radio" name={`q-${i}`} className="accent-pink-500" /> {r}
                </label>
              ))}
            </div>

          </div>
        ))}
      </div>

      {/* FOOTER ACTIONS */}
        <div
          className={`mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t pt-4 ${
            darkMode ? "border-slate-700" : "border-gray-100"
          }`}
        >

          {/* CLOSE BUTTON */}
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(false);
            }}
            className="px-6 py-3 rounded-xl border border-red-700 bg-red-700 text-white font-medium transition-all duration-200 hover:bg-red-600 active:scale-[0.98]"
          >
            Close
          </button>

          {/* SAVE BUTTON */}
          <button
            onClick={saveEvaluation}
            disabled={saving}
            className="px-6 py-3 bg-pink-600 text-white font-medium rounded-xl shadow-sm shadow-pink-500/30 transition-all duration-200 hover:bg-pink-600 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
          >
            {saving ? "Creating..." : "Create Evaluation Form"}
          </button>

        </div>

    </div>
  </div>
)}
      {/* TABLE */}
      <div
        className={`rounded-3xl p-4 sm:p-6 shadow-sm border ${
          darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
        }`}
      >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

            <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
              Evaluation Forms
            </h2>

            <div className="w-full md:w-80">
              <input
                type="text"
                placeholder="Search event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all ${
                  darkMode
                    ? "border-pink-500 bg-slate-800 text-white placeholder-slate-400"
                    : "border-pink-600 bg-white"
                }`}
              />
            </div>

          </div>
        

        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                className={`py-3 px-2 text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Event
              </th>
              <th
                className={`py-3 px-2 text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Respondent
              </th>
              <th
                className={`py-3 px-2 text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Rating
              </th>
              <th
                className={`py-3 px-2 text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {evaluations
              .filter((ev) =>
                ev.eventName.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((ev, idx) => {
              const result = results.find(
                (r) => r.evaluationId === ev.id
              );

              const agg = result?.aggregated || {};

              const totalResponses = result?.respondents || 0;

              let score = 0;
              let count = 0;

              Object.values(agg).forEach((s) => {
                score += s.scoreSum || 0;
                count += s.total || 0;
              });

              const avg = count ? (score / count).toFixed(2) : "0.0";

              return (
                <tr
                  key={ev.id}
                  className={`transition-colors duration-150 ${
                    darkMode
                      ? `hover:bg-slate-800/60 ${idx % 2 === 0 ? "bg-slate-800/30" : "bg-transparent"}`
                      : `hover:bg-pink-50/60 ${idx % 2 === 0 ? "bg-gray-50/60" : "bg-transparent"}`
                  }`}
                >
                  <td
                    className={`py-3.5 px-2 rounded-l-xl font-medium ${
                      darkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {ev.eventName}
                  </td>
                  <td className={`py-3.5 px-2 ${darkMode ? "text-pink-400" : "text-pink-600"}`}>
                    {totalResponses}
                  </td>
                  <td className={`py-3.5 px-2 ${darkMode ? "text-pink-400" : "text-pink-600"}`}>
                    {avg}
                  </td>
                  <td className="py-3.5 px-2 rounded-r-xl">
                    <div className="flex gap-2 flex-wrap">

                      <button
                        onClick={() => handleViewQR(ev)}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg transition-all duration-200 hover:bg-blue-600 active:scale-[0.98]"
                      >
                        <FaQrcode />
                      </button>
                                <button
                                  onClick={() => {
                                    setQrType("results");

                                    const link = `${window.location.origin}/evaluation/${ev.id}/results`;

                                    setQrLink(link);
                                    setSelectedEvent(ev);
                                    setShowQR(true);
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg transition-all duration-200 hover:bg-emerald-600 active:scale-[0.98]"
                                >
                                  <FaChartBar />
                                </button>

                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg transition-all duration-200 hover:bg-red-600 active:scale-[0.98]"
                      >
                        <FaTrash />
                      </button>

                    </div>
                  </td>
                </tr>

              );
            })} 
          </tbody>
        </table>
        </div>

        {evaluations.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? "bg-slate-800" : "bg-gray-100"
              }`}
            >
              <span className="text-lg">🗒️</span>
            </div>
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-gray-400"}`}>
              No evaluation forms yet
            </p>
          </div>
        )}
      </div>

    

          {/* QR */}
          {showQR && selectedEvent && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div
                className={`p-6 sm:p-7 rounded-3xl text-center w-full max-w-[320px] shadow-2xl border ${
                  darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100"
                }`}
              >


                    <h1 className="text-lg font-bold text-pink-600">
                      {qrType === "form"
                        ? "Evaluation Form"
                        : "Evaluation Results"}
                    </h1>
                {/* EVENT NAME */}
                <h2 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {selectedEvent.eventName}
                </h2>

                <p className={`text-xs mb-4 ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {selectedEvent.eventDate}
                </p>

                <div
                  ref={qrRef}
                  className={`flex justify-center p-3 rounded-2xl ${
                    darkMode ? "bg-slate-100" : "bg-gray-50"
                  }`}
                >
                  <QRCodeCanvas value={qrLink} size={220} />
                </div>

                <p className={`mt-3 text-xs break-all ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {qrLink}
                </p>

                <div className="flex gap-2 mt-5">

                  {/* DOWNLOAD QR */}
                  <button
                    onClick={() => {
                      const qrCanvas = qrRef.current?.querySelector("canvas");
                      if (!qrCanvas) return;

                      const poster = document.createElement("canvas");
                      const ctx = poster.getContext("2d");

                      poster.width = 700;
                      poster.height = 950;

                      // Background
                      ctx.fillStyle = "#ffffff";
                      ctx.fillRect(0, 0, poster.width, poster.height);

                      // Border
                      ctx.strokeStyle = "#ec4899";
                      ctx.lineWidth = 6;
                      ctx.strokeRect(15, 15, poster.width - 30, poster.height - 30);

                      // Title
                      ctx.fillStyle = "#db2777";
                      ctx.font = "bold 42px Arial";
                      ctx.textAlign = "center";
                      ctx.fillText(
                        qrType === "form"
                          ? "Evaluation Form"
                          : "Evaluation Results",
                        poster.width / 2,
                        80
                      );

                      // Event Name
                      ctx.fillStyle = "#111827";
                      ctx.font = "bold 30px Arial";
                      ctx.fillText(selectedEvent.eventName, poster.width / 2, 140);

                      // Event Date
                      ctx.fillStyle = "#6b7280";
                      ctx.font = "22px Arial";
                      ctx.fillText(selectedEvent.eventDate, poster.width / 2, 180);

                      // White box for QR
                      ctx.fillStyle = "#f9fafb";
                      ctx.fillRect(150, 220, 400, 400);

                      // Draw QR
                      ctx.drawImage(qrCanvas, 170, 240, 360, 360);

                      // Instruction
                      ctx.fillStyle = "#374151";
                      ctx.font = "24px Arial";
                      ctx.fillText(
                        qrType === "form"
                          ? "Scan to access the evaluation form"
                          : "Scan to view the evaluation results",
                        poster.width / 2,
                        690
                      );

                      // Link
                      ctx.fillStyle = "#2563eb";
                      ctx.font = "18px Arial";

                      const maxWidth = 600;
                      const words = qrLink.split("");
                      let line = "";
                      let y = 740;

                      for (let i = 0; i < words.length; i++) {
                        const test = line + words[i];
                        if (ctx.measureText(test).width > maxWidth) {
                          ctx.fillText(line, poster.width / 2, y);
                          line = words[i];
                          y += 24;
                        } else {
                          line = test;
                        }
                      }

                      ctx.fillText(line, poster.width / 2, y);

                      // Footer
                      ctx.fillStyle = "#9ca3af";
                      ctx.font = "18px Arial";
                      ctx.fillText("Generated by EVOSAS", poster.width / 2, 900);

                      // Download
                      const link = document.createElement("a");
                      link.href = poster.toDataURL("image/png");
                      link.download = `${selectedEvent.eventName}-${
                        qrType === "form"
                          ? "EvaluationForm"
                          : "EvaluationResults"
                      }.png`;
                      link.click();
                    }}
                    className="flex-1 bg-emerald-500 text-white text-sm font-medium px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-emerald-600 active:scale-[0.98]"
                  >
                    Download QR
                  </button>

                  {/* CLOSE */}
                  <button
                    onClick={() => setShowQR(false)}
                    className="flex-1 bg-gray-500 text-white text-sm font-medium px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-gray-600 active:scale-[0.98]"
                  >
                    Close
                  </button>

                </div>
              </div>
            </div>
          )}
     </div>
    </div>
  );
}