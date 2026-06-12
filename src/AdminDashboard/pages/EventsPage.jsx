import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function EventEvaluationPage() {
  const [showForm, setShowForm] = useState(false);

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

  const [editingIndex, setEditingIndex] = useState(null);

  const ratings = [
    "Strongly Agree",
    "Agree",
    "Neutral",
    "Disagree",
    "Strongly Disagree",
  ];

  const handleQuestionChange = (index, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = value;
    setQuestions(updatedQuestions);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      `New Question ${questions.length + 1}`,
    ]);
  };

  const deleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);

    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 shadow-md border border-white">
        <h1 className="text-3xl font-bold text-gray-800">
          Event Evaluation Management
        </h1>

        <p className="text-gray-500 mt-2">
          Create evaluation forms, generate QR codes, and analyze student
          feedback.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow border">
          <p className="text-gray-500 text-sm">Total Evaluations</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">15</h2>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow border">
          <p className="text-gray-500 text-sm">Responses</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">532</h2>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow border">
          <p className="text-gray-500 text-sm">Average Rating</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">4.78</h2>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl p-6 shadow border">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600"
          >
            {showForm ? "Close Form" : "Create Evaluation Form"}
          </button>

          <button className="px-5 py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600">
            Generate QR Code
          </button>

          <button className="px-5 py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600">
            View Responses
          </button>

          <button className="px-5 py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600">
            Export Report
          </button>
        </div>
      </div>

      {/* Evaluation Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow border">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Event Evaluation Form
            </h2>

            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              + Add Question
            </button>
          </div>

          {/* Event Details */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Name
              </label>
              <input
                type="text"
                placeholder="Enter event name"
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Date
              </label>
              <input
                type="date"
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-5">
            {questions.map((question, index) => (
              <div
                key={index}
                className="border rounded-xl p-4 bg-gray-50"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
                  {editingIndex === index ? (
                    <input
                      type="text"
                      value={question}
                      onChange={(e) =>
                        handleQuestionChange(index, e.target.value)
                      }
                      className="flex-1 border rounded-lg p-2"
                    />
                  ) : (
                    <p className="font-medium text-gray-800">
                      {index + 1}. {question}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingIndex(
                          editingIndex === index ? null : index
                        )
                      }
                      className={`px-4 py-2 rounded-lg text-white text-sm ${
                        editingIndex === index
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-blue-500 hover:bg-blue-600"
                      }`}
                    >
                      {editingIndex === index
                        ? "Save"
                        : "Edit Question"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteQuestion(index)}
                      className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  {ratings.map((rating) => (
                    <label
                      key={rating}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={rating}
                        className="accent-pink-500"
                      />
                      <span className="text-sm text-gray-700">
                        {rating}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments / Suggestions
            </label>

            <textarea
              rows="4"
              placeholder="Enter your comments here..."
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-pink-400 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <button className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600">
              Save Evaluation Form
            </button>
          </div>
        </div>
      )}

      {/* Evaluation Forms Table */}
      <div className="bg-white rounded-2xl p-6 shadow border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Evaluation Forms
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-3">Event</th>
                <th className="py-3">Responses</th>
                <th className="py-3">Rating</th>
                <th className="py-3">Status</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-b">
                <td className="py-4">Leadership Seminar 2026</td>
                <td>350</td>
                <td>4.82</td>
                <td>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                    Active
                  </span>
                </td>
                <td>
                  <button className="text-pink-500 hover:underline">
                    View
                  </button>
                </td>
              </tr>

              <tr>
                <td className="py-4">Student Congress</td>
                <td>182</td>
                <td>4.71</td>
                <td>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    Closed
                  </span>
                </td>
                <td>
                  <button className="text-pink-500 hover:underline">
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}