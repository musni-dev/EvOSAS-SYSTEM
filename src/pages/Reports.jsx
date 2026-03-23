import { useState } from "react";

const Reports = () => {
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    name: "",
    section: "",
    evidence: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm({
      ...form,
      [name]: files ? files[0] : value,
    });
  };

  const handleSubmit = () => {
    alert(`${selected} report submitted!`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Reports</h1>

      {/*  Choose Card */}
      {!selected && (
        <div className="grid md:grid-cols-2 gap-8">
          <div
            onClick={() => setSelected("Incident")}
            className="cursor-pointer bg-white shadow-xl rounded-2xl p-10 border hover:scale-105 transition"
          >
            <h2 className="text-2xl font-semibold text-red-600 mb-2">
              Incidents Report
            </h2>
            <p className="text-gray-600">
              Report disciplinary or incident cases here.
            </p>
          </div>

          <div
            onClick={() => setSelected("Lost & Found")}
            className="cursor-pointer bg-white shadow-xl rounded-2xl p-10 border hover:scale-105 transition"
          >
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              Lost & Found Report
            </h2>
            <p className="text-gray-600">
              Report lost or found items here.
            </p>
          </div>
        </div>
      )}

      {/*  Show Form */}
      {selected && (
        <div className="bg-white shadow-lg rounded-2xl p-8 border max-w-xl mx-auto">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-gray-500 mb-4 underline"
          >
            ← Back
          </button>

          <h2 className="text-xl font-semibold mb-4">
            {selected} Form
          </h2>

          <input
            type="text"
            name="name"
            placeholder="Name of Reporter"
            className="w-full mb-3 p-3 border rounded-lg"
            onChange={handleChange}
          />

          <input
            type="text"
            name="section"
            placeholder="Section"
            className="w-full mb-3 p-3 border rounded-lg"
            onChange={handleChange}
          />

          <label className="block mb-2 text-sm font-medium">
            Upload Evidence
          </label>
          <input
            type="file"
            name="evidence"
            className="w-full mb-4"
            onChange={handleChange}
          />
            
          <button
            onClick={handleSubmit}
            className={`w-full text-white p-3 rounded-lg ${
              selected === "Incident"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Submit {selected}
          </button>
        </div>
      )}
    </div>
  );
};

export default Reports;