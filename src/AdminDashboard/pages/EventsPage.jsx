import { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { db } from "../../firebase/firebase";
import { collection, addDoc, Timestamp, onSnapshot, deleteDoc, doc } from "firebase/firestore";

export default function EventsPage() {
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

  const [questions, setQuestions] = useState([
    "The event was well organized.",
    "The speakers/resource persons were knowledgeable.",
    "The event objectives were clearly achieved.",
    "The venue and facilities were satisfactory.",
    "The event schedule was properly managed.",
    "I gained valuable knowledge from this event.",
    "I would recommend this event to other students.",
    "The event activities were engaging.",
    "The event met my expectations.",
    "Overall, I am satisfied with this event.",
  ]);

  const ratings = [
    "Strongly Agree",
    "Agree",
    "Neutral",
    "Disagree",
    "Strongly Disagree",
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
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

const handleViewQR = (ev) => {
  const link = `${window.location.origin}/evaluation/${ev.id}`;

  setSelectedEvent(ev);
  setQrLink(link);
  setShowQR(true);
};

const handleDelete = async (id) => {
  if (!window.confirm("Delete this evaluation form?")) return;

  try {
    await deleteDoc(doc(db, "evaluations", id));
    alert("Deleted successfully");
  } catch (err) {
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

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-md border border-white">
        <h1 className="text-3xl font-bold text-gray-800">
          Event Evaluation Management
        </h1>
        <p className="text-gray-500 mt-2">
          Create evaluation forms, generate QR codes, and analyze feedback.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow border">
          <p className="text-gray-500 text-sm">Total Evaluations</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">
            {evaluations.length}
          </h2>
        </div>



  
      </div>

      {/* ACTIONS */}
      <div className="bg-white rounded-2xl p-6 shadow border">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600"
          >
            {showForm ? "Close Form" : "Create Evaluation Form"}
          </button>
        </div>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow border">

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Event Evaluation Form
            </h2>

            <button
              onClick={addQuestion}
              className="px-4 py-2 bg-green-500 text-white rounded-lg"
            >
              + Add Question
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Event Name"
              className="border p-3 rounded-lg"
            />

            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="border p-3 rounded-lg"
            />
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="border p-4 rounded-xl bg-gray-50">

                <input
                  value={q}
                  onChange={(e) => handleQuestionChange(i, e.target.value)}
                  className="border p-2 w-full rounded"
                />

                <button
                  onClick={() => deleteQuestion(i)}
                  className="text-red-500 text-sm mt-2"
                >
                  Delete
                </button>

                <div className="flex gap-4 flex-wrap mt-2">
                  {ratings.map((r) => (
                    <label key={r} className="text-sm">
                      <input type="radio" name={`q-${i}`} /> {r}
                    </label>
                  ))}
                </div>

              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={saveEvaluation}
              disabled={saving}
              className="px-6 py-3 bg-pink-500 text-white rounded-xl"
            >
              {saving ? "Saving..." : "Save Evaluation Form"}
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-2xl p-6 shadow border">
        <h2 className="text-xl font-semibold mb-4">
          Evaluation Forms
        </h2>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-3">Event</th>
              <th>Responses</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {evaluations.map((ev) => {
              const result = results.find(
                (r) => r.evaluationId === ev.id
              );

              const agg = result?.aggregated || {};

              const totalResponses = Object.values(agg).reduce(
                (a, b) => a + (b.total || 0),
                0
              );

              let score = 0;
              let count = 0;

              Object.values(agg).forEach((s) => {
                score += s.scoreSum || 0;
                count += s.total || 0;
              });

              const avg = count ? (score / count).toFixed(2) : "0.0";

              return (
                <tr key={ev.id} className="border-b">
                  <td className="py-4">{ev.eventName}</td>
                  <td>{totalResponses}</td>
                  <td>{avg}</td>
                  <td>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                      {ev.status}
                    </span>
                  </td>
                  <td>
  <div className="flex gap-2 flex-wrap">

    <button
      onClick={() => handleViewQR(ev)}
      className="px-3 py-1 text-xs bg-blue-500 text-white rounded"
    >
      View QR
    </button>

    <button
      onClick={() => {
        const link = `${window.location.origin}/evaluation/${ev.id}/results`;
        setQrLink(link);
        setSelectedEvent(ev);
        setShowQR(true);
      }}
      className="px-3 py-1 text-xs bg-green-500 text-white rounded"
    >
        Response / Final Rating QR
    </button>

    <button
      onClick={() => handleDelete(ev.id)}
      className="px-3 py-1 text-xs bg-red-500 text-white rounded"
    >
      Delete
    </button>

  </div>
</td>
                </tr>

                

              );

              
            })}
            
          </tbody>
        </table>
      </div>

    

      {/* QR */}
          {showQR && selectedEvent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-xl text-center w-[320px]">

                {/* EVENT NAME */}
                <h2 className="text-lg font-bold text-gray-800">
                  {selectedEvent.eventName}
                </h2>

                <p className="text-xs text-gray-500 mb-3">
                  {selectedEvent.eventDate}
                </p>

                <div ref={qrRef} className="flex justify-center">
                  <QRCodeCanvas value={qrLink} size={220} />
                </div>

                <p className="mt-3 text-xs break-all text-gray-600">
                  {qrLink}
                </p>

                <div className="flex gap-2 mt-4">

                  {/* DOWNLOAD QR */}
                  <button
                    onClick={() => {
                      const canvas = qrRef.current?.querySelector("canvas");
                      if (!canvas) return;

                      const url = canvas.toDataURL("image/png");

                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${selectedEvent.eventName}-QR.png`;
                      a.click();
                    }}
                    className="flex-1 bg-green-500 text-white px-3 py-2 rounded"
                  >
                    Download QR
                  </button>

                  {/* CLOSE */}
                  <button
                    onClick={() => setShowQR(false)}
                    className="flex-1 bg-gray-500 text-white px-3 py-2 rounded"
                  >
                    Close
                  </button>

                </div>
              </div>
            </div>
          )}
    </div>
  );
}