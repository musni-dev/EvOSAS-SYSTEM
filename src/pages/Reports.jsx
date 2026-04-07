import { useState } from "react";
import { db, storage } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const Reports = () => {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Privacy modal + checkbox
  const [agree, setAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    course: "",
    yearSection: "",
    dateIncident: "",
    timeIncident: "",
    location: "",
    incidentType: "",
    otherType: "",
    reportedPerson: "",
    reportedCourse: "",
    role: "",
    description: "",
    itemName: "",
    itemDescription: "",
    evidence: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm({
      ...form,
      [name]: files ? files[0] : value,
    });
  };

  // ✅ VALIDATION
  const isFormValid = () => {
    if (!agree) return false;

    if (selected === "Incident") {
      return (
        form.course &&
        form.yearSection &&
        form.dateIncident &&
        form.timeIncident &&
        form.location &&
        form.incidentType
      );
    }

    if (selected === "Lost & Found") {
      return form.itemName && form.location;
    }

    return false;
  };

  const handleSubmit = async () => {
    if (!agree) {
      setAgreeError(true);
      return;
    }

    if (!isFormValid()) return;

    setAgreeError(false);
    setLoading(true);

    try {
      let fileURL = "";

      if (form.evidence) {
        const fileRef = ref(
          storage,
          `reports/${Date.now()}_${form.evidence.name}`
        );
        await uploadBytes(fileRef, form.evidence);
        fileURL = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "reports"), {
        ...form,
        type: selected,
        incidentType:
          form.incidentType === "Other"
            ? form.otherType
            : form.incidentType,
        evidence: fileURL,
        status: "pending",
        dateReported: new Date(),
        createdAt: serverTimestamp(),
      });

      alert("Report submitted successfully!");

      // reset
      setForm({
        name: "",
        course: "",
        yearSection: "",
        dateIncident: "",
        timeIncident: "",
        location: "",
        incidentType: "",
        otherType: "",
        reportedPerson: "",
        reportedCourse: "",
        role: "",
        description: "",
        itemName: "",
        itemDescription: "",
        evidence: null,
      });

      setAgree(false);
      setSelected(null);
    } catch (error) {
      console.error(error);
      alert("Error submitting report");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-10 text-[#ff6699]">
        Submit a Report
      </h1>

      {/* SELECT TYPE */}
      {!selected && (
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div
            onClick={() => setSelected("Incident")}
            className="cursor-pointer bg-white rounded-3xl p-10 shadow-lg border hover:shadow-2xl hover:-translate-y-1 transition"
          >
            <h2 className="text-2xl font-bold text-red-500 mb-2">
              🚨 Incident Report
            </h2>
            <p className="text-gray-600">Report disciplinary or incident cases.</p>
          </div>

          <div
            onClick={() => setSelected("Lost & Found")}
            className="cursor-pointer bg-white rounded-3xl p-10 shadow-lg border hover:shadow-2xl hover:-translate-y-1 transition"
          >
            <h2 className="text-2xl font-bold text-blue-500 mb-2">
              🎒 Lost & Found
            </h2>
            <p className="text-gray-600">Report lost or found items.</p>
          </div>
        </div>
      )}

      {/* ================= INCIDENT ================= */}
      {selected === "Incident" && (
        <div className="bg-white shadow-2xl rounded-3xl p-8 border max-w-2xl mx-auto">

          {/* BACK */}
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg bg-gray-100 hover:bg-[#ff6699] hover:text-white transition font-medium"
          >
            ← Back
          </button>

          <h2 className="text-2xl font-bold mb-6 text-[#ff6699] text-center">
            Incident Report Form
          </h2>

          {/* BASIC */}
          <input
            name="name"
            placeholder="Name (optional)"
            className="w-full mb-3 p-3 rounded-xl border"
            onChange={handleChange}
          />

          <input
            name="course"
            placeholder="Course *"
            className={`w-full mb-1 p-3 rounded-xl border ${!form.course && "border-red-400"}`}
            onChange={handleChange}
          />
          {!form.course && <p className="text-red-500 text-xs">Required</p>}

          <input
            name="yearSection"
            placeholder="Year & Section *"
            className={`w-full mb-1 p-3 rounded-xl border ${!form.yearSection && "border-red-400"}`}
            onChange={handleChange}
          />
          {!form.yearSection && <p className="text-red-500 text-xs">Required</p>}

          <div className="grid grid-cols-2 gap-4 mt-2">
            <input type="date" name="dateIncident"
              className={`p-3 rounded-xl border ${!form.dateIncident && "border-red-400"}`}
              onChange={handleChange}
            />
            <input type="time" name="timeIncident"
              className={`p-3 rounded-xl border ${!form.timeIncident && "border-red-400"}`}
              onChange={handleChange}
            />
          </div>

          <input
            name="location"
            placeholder="Location *"
            className={`w-full mt-3 p-3 rounded-xl border ${!form.location && "border-red-400"}`}
            onChange={handleChange}
          />

          {/* TYPE */}
          <h3 className="mt-6 mb-2 font-semibold">
            Type of Incident <span className="text-red-500">*</span>
          </h3>

          <div className="flex flex-wrap gap-3">
            {["Academic", "Behavioral", "Safety/Health", "Property Damage", "Other"].map((type) => (
              <label key={type}
                className={`px-4 py-2 rounded-full cursor-pointer text-sm border
                ${form.incidentType === type ? "bg-[#ff6699] text-white" : "bg-gray-100"}`}>
                <input type="radio" name="incidentType" value={type} className="hidden" onChange={handleChange} />
                {type}
              </label>
            ))}
          </div>

          {/* PERSON INVOLVED */}
          <h3 className="mt-6 mb-2 font-semibold">Person Involved (optional)</h3>

          <input name="reportedPerson" placeholder="Name"
            className="w-full p-3 mb-3 rounded-xl border"
            onChange={handleChange}
          />

          <input name="reportedCourse" placeholder="Course"
            className="w-full p-3 mb-3 rounded-xl border"
            onChange={handleChange}
          />

          <select name="role"
            className="w-full p-3 mb-3 rounded-xl border"
            onChange={handleChange}
          >
            <option value="">Select Role</option>
            <option>Student</option>
            <option>Teacher</option>
            <option>Staff</option>
          </select>

          <textarea
            name="description"
            placeholder="Narrative (optional)"
            className="w-full p-3 h-28 rounded-xl border"
            onChange={handleChange}
          />

          {/* FILE */}
          <input
            type="file"
            name="evidence"
            className="mt-4 w-full text-sm file:bg-[#ff6699] file:text-white file:px-4 file:py-2 file:rounded-lg"
            onChange={handleChange}
          />

          {/* DATA PRIVACY */}
          <div className="mt-6">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => {
                  setAgree(e.target.checked);
                  setAgreeError(false);
                }}
                className="mt-1 accent-[#ff6699]"
              />

              <span className="text-gray-600">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="text-[#ff6699] font-semibold underline"
                >
                  Data Privacy Act
                </button>
              </span>
            </label>

            {agreeError && (
              <p className="text-red-500 text-xs mt-1">
                You must agree before submitting.
              </p>
            )}
          </div>

          {/* BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={!isFormValid() || loading}
            className={`mt-6 w-full py-3 rounded-xl font-bold transition ${
              isFormValid()
                ? "bg-[#ff6699] text-white hover:bg-[#ff77aa]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? "Submitting..." : "Submit Incident Report"}
          </button>
        </div>
      )}

      {/* ================= LOST & FOUND ================= */}
      {selected === "Lost & Found" && (
        <div className="bg-white shadow-2xl rounded-3xl p-8 border max-w-xl mx-auto">

          {/* BACK */}
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg bg-gray-100 hover:bg-[#ff6699] hover:text-white transition font-medium"
          >
            ← Back
          </button>

          <h2 className="text-2xl font-bold mb-6 text-[#ff6699] text-center">
            Lost & Found Form
          </h2>

          {/* LOST / FOUND RADIO */}
          <h3 className="font-semibold mb-2">Report Type *</h3>

          <div className="flex gap-4 mb-4">
            {["Lost", "Found"].map((type) => (
              <label
                key={type}
                className={`px-4 py-2 rounded-full border cursor-pointer transition
                ${form.lfType === type ? "bg-[#ff6699] text-white" : "bg-gray-100"}`}
              >
                <input
                  type="radio"
                  name="lfType"
                  value={type}
                  className="hidden"
                  onChange={handleChange}
                />
                {type}
              </label>
            ))}
          </div>

          {/* FOUND NOTICE */}
          {form.lfType === "Found" && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
              📌 Found items must be surrendered to <b>OSAS or SSC Office</b>
            </div>
          )}

          {/* ITEM NAME */}
          <input
            name="itemName"
            placeholder="Item Name *"
            className={`w-full mb-3 p-3 rounded-xl border ${
              !form.itemName && "border-red-400"
            }`}
            onChange={handleChange}
          />
          {!form.itemName && (
            <p className="text-red-500 text-xs">Required</p>
          )}

          {/* CATEGORY */}
          <select
            name="lfCategory"
            className="w-full mb-3 p-3 rounded-xl border"
            onChange={handleChange}
          >
            <option value="">Category / Type *</option>
            <option>ID Card</option>
            <option>Wallet</option>
            <option>Phone</option>
            <option>Bag</option>
            <option>Keys</option>
            <option>School Supplies</option>
            <option>Electronics</option>
            <option>Others</option>
          </select>

          {/* LOCATION */}
          <input
            name="location"
            placeholder="Location (Where you Found or Last seen the item) *"
            className={`w-full mb-3 p-3 rounded-xl border ${
              !form.location && "border-red-400"
            }`}
            onChange={handleChange}
          />
          {!form.location && (
            <p className="text-red-500 text-xs">Required</p>
          )}

          {/* DESCRIPTION */}
          <textarea
            name="itemDescription"
            placeholder="Description (optional)"
            className="w-full p-3 h-28 rounded-xl border"
            onChange={handleChange}
          />

          {/* DATA PRIVACY */}
          <div className="mt-6">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => {
                  setAgree(e.target.checked);
                  setAgreeError(false);
                }}
                className="mt-1 accent-[#ff6699]"
              />

              <span className="text-gray-600">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="text-[#ff6699] font-semibold underline"
                >
                  Data Privacy Act
                </button>
              </span>
            </label>

            {agreeError && (
              <p className="text-red-500 text-xs mt-1">
                Required before submitting.
              </p>
            )}
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={!isFormValid() || loading}
            className={`mt-6 w-full py-3 rounded-xl font-bold transition ${
              isFormValid()
                ? "bg-[#ff6699] text-white hover:bg-[#ff77aa]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? "Submitting..." : "Submit Lost & Found"}
          </button>
        </div>
      )}

      {/* ================= PRIVACY MODAL ================= */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-2xl">

            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold text-[#ff6699]">
                Data Privacy Act
              </h2>
              <button onClick={() => setShowPrivacy(false)}>✕</button>
            </div>

            <div className="text-sm text-gray-600 space-y-3">
              <p>
                Your data is protected under the Data Privacy Act of 2012.
                It will only be used for official OSAS purposes.
              </p>
              <p>
                By submitting, you consent to processing and storage of your
                information for investigation and reporting.
              </p>
            </div>

            <button
              onClick={() => setShowPrivacy(false)}
              className="mt-6 w-full bg-[#ff6699] text-white py-2 rounded-lg"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;