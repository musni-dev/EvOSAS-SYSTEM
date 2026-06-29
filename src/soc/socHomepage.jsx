import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function SOCHomepage() {
  const navigate = useNavigate();

  const [organization, setOrganization] = useState("");
  const [file, setFile] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
  return localStorage.getItem("theme") === "dark";
});

useEffect(() => {
  if (darkMode) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("acceptedTerms");
    navigate("/login");
  };

  useEffect(() => {
    const q = query(
      collection(db, "organization_bylaws"),
      orderBy("uploadedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const files = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUploads(files);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {

  }, []);

  const handleUpload = async () => {
    if (!organization.trim()) {
      alert("Please enter organization name.");
      return;
    }

    if (!file) {
      alert("Please select a PDF file.");
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return;
    }

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("File size must not exceed 2MB.");
      return;
    }

    try {
      setLoading(true);

      const storageRef = ref(
        storage,
        `organization_bylaws/${Date.now()}_${file.name}`
      );

      await uploadBytes(storageRef, file);

      const fileURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "organization_bylaws"), {
        organization,
        fileName: file.name,
        fileURL,
        status: "Pending",
        uploadedAt: serverTimestamp(),
      });

      alert("File uploaded successfully!");

      setOrganization("");
      setFile(null);

      const fileInput = document.getElementById("fileUpload");
      if (fileInput) fileInput.value = "";

      fetchUploads();
    } catch (error) {
      console.error(error);
      alert("Upload failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_CONFIG = {
    Pending: {
      badge: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      dot: "bg-yellow-400",
      icon: "🕐",
      bar: "border-l-4 border-yellow-400 bg-yellow-50",
      message: "Your submission is awaiting admin review.",
    },
    "In Process": {
      badge: "bg-blue-100 text-blue-700 border border-blue-300",
      dot: "bg-blue-400",
      icon: "🔄",
      bar: "border-l-4 border-blue-400 bg-blue-50",
      message: "Your by-laws are currently being reviewed by the admin.",
    },
    Approved: {
      badge: "bg-green-100 text-green-700 border border-green-300",
      dot: "bg-green-400",
      icon: "✅",
      bar: "border-l-4 border-green-500 bg-green-50",
      message: "Your by-laws have been approved!",
    },
    Rejected: {
      badge: "bg-red-100 text-red-700 border border-red-300",
      dot: "bg-red-400",
      icon: "❌",
      bar: "border-l-4 border-red-500 bg-red-50",
      message: "Your by-laws were rejected. Please revise and re-submit.",
    },
  };

  return (
    <div
        className={`min-h-screen font-sans transition-colors duration-300 ${
          darkMode
            ? "bg-gray-950 text-white"
            : "bg-gray-50 text-gray-900"
        }`}
      >

      {/* Top Header Bar */}
      <div
          className={`px-6 py-5 shadow-md ${
            darkMode
              ? "bg-gray-900 border-b border-gray-800"
              : "bg-pink-600 text-white"
          }`}
        >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold ${
              darkMode ? "text-white" : "text-white"
            }`}>
              Student Organization Coordinator
            </h1>
            <p className={`text-sm mt-0.5 ${
                darkMode ? "text-gray-400" : "text-pink-200"
              }`}>
              Manage organization by-laws and uploaded documents.
            </p>
          </div>



            <button
    onClick={() => setDarkMode(!darkMode)}
    className={`px-5 py-2 rounded-xl font-semibold text-sm transition ${
      darkMode
        ? "bg-yellow-500 text-black hover:bg-yellow-400"
        : "bg-gray-800 text-white hover:bg-gray-700"
    }`}
  >
    {darkMode ? "☀ Light" : "🌙 Dark"}
  </button>
          <button
            onClick={handleLogout}
            className={`font-semibold px-5 py-2 rounded-xl transition text-sm shadow-sm ${
              darkMode
                ? "bg-gray-800 text-white hover:bg-gray-700"
                : "bg-white text-pink-600 hover:bg-pink-50"
            }`}>
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="bg-pink-100 text-pink-600 rounded-xl p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">Upload Organization By-laws</h2>
          </div>

          <div className="px-6 py-6">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Enter organization name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Upload By-laws
                </label>
                <input
                  id="fileUpload"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-pink-100 file:text-pink-700 file:font-semibold file:text-xs hover:file:bg-pink-200 transition"
                />
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <span>📄</span> PDF only · Maximum file size: 2MB
                </p>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={handleUpload}
                disabled={loading}
                className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                    </svg>
                    Upload File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Status Legend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Status Legend</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <span key={key} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {key}
              </span>
            ))}
          </div>
        </div>

        {/* Uploaded Files */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-pink-100 text-pink-600 rounded-xl p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Uploaded By-laws</h2>
                <p className="text-xs text-gray-400">Status updates in real-time as admin reviews your files.</p>
              </div>
            </div>
            {uploads.length > 0 && (
              <span className="bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full">
                {uploads.length} file{uploads.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-pink-600 text-white text-sm">
                  <th className="px-5 py-3.5 text-left font-semibold">Organization</th>
                  <th className="px-5 py-3.5 text-left font-semibold">File Name</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Upload Date</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Admin Status</th>
                  <th className="px-5 py-3.5 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uploads.length > 0 ? (
                  uploads.map((item) => {
                    const status = item.status || "Pending";
                    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Pending"];
                    return (
                      <tr key={item.id} className={`transition ${cfg.bar}`}>
                        <td className="px-5 py-4 text-sm font-medium text-gray-800">
                          {item.organization}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 max-w-[200px]">
                          <span className="flex items-center gap-1.5 truncate" title={item.fileName}>
                            <span className="text-gray-400 shrink-0">📄</span>
                            {item.fileName}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {item.uploadedAt?.seconds
                            ? new Date(item.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                                year: "numeric", month: "short", day: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ${cfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                              {cfg.icon} {status}
                            </span>
                            <p className="text-xs text-gray-500 pl-1">{cfg.message}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center gap-2">
                            <a
                              href={item.fileURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition"
                            >
                              View
                            </a>
                            <button
                              onClick={() => window.open(item.fileURL, "_blank")}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition"
                            >
                              Re-Submit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <span className="text-5xl">📂</span>
                        <p className="font-semibold text-gray-500">No uploaded documents yet</p>
                        <p className="text-sm">Upload a by-laws file to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {uploads.length > 0 ? (
              uploads.map((item) => {
                const status = item.status || "Pending";
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Pending"];
                return (
                  <div key={item.id} className={`p-4 space-y-3 ${cfg.bar}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{item.organization}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{item.fileName}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                        {cfg.icon} {status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 italic">{cfg.message}</p>
                    <p className="text-xs text-gray-400">
                      Uploaded:{" "}
                      {item.uploadedAt?.seconds
                        ? new Date(item.uploadedAt.seconds * 1000).toLocaleDateString("en-PH", {
                            year: "numeric", month: "short", day: "numeric",
                          })
                        : "—"}
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={item.fileURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold transition"
                      >
                        View
                      </a>
                      <button
                        onClick={() => window.open(item.fileURL, "_blank")}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-xs font-semibold transition"
                      >
                        Re-Submit
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-gray-400">
                <span className="text-5xl block mb-2">📂</span>
                <p className="font-semibold text-gray-500">No uploaded documents yet</p>
                <p className="text-sm">Upload a by-laws file to get started.</p>
              </div>
            )}
          </div>

          {uploads.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {uploads.length} submission{uploads.length !== 1 ? "s" : ""} · Updates automatically when admin reviews
            </div>
          )}
        </div>
      </div>
    </div>
  );
}