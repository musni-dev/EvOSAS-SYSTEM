
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { db, storage } from "../firebase/firebase";

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default function SOCHomepage() {
  const navigate = useNavigate();

  const [organization, setOrganization] = useState("");
  const [file, setFile] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);

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

    // PDF only
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return;
    }

    // 2MB limit
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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-md p-6 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Student Organization Coordinator
          </h1>

          <p className="text-gray-500 mt-1">
            Manage organization by-laws and uploaded documents.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg transition"
        >
          Logout
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-pink-500 mb-6">
          Upload Organization By-laws
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Organization Name
            </label>

            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Enter organization name"
              className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Upload By-laws
            </label>

            <input
              id="fileUpload"
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full border rounded-lg px-4 py-3 cursor-pointer"
            />

            <p className="text-sm text-gray-500 mt-2">
              PDF only • Maximum file size: 2MB
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload File"}
          </button>
        </div>
      </div>

      {/* Uploaded Files */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-pink-500 mb-6">
          Uploaded By-laws
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-pink-500 text-white">
              <tr>
                <th className="px-5 py-3 text-left">Organization</th>
                <th className="px-5 py-3 text-left">File Name</th>
                <th className="px-5 py-3 text-left">Upload Date</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {uploads.length > 0 ? (
                uploads.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      {item.organization}
                    </td>

                    <td className="px-5 py-4">
                      {item.fileName}
                    </td>

                    <td className="px-5 py-4">
                      {item.uploadedAt?.seconds
                        ? new Date(
                            item.uploadedAt.seconds * 1000
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="px-5 py-4">
  <span
    className={`px-3 py-1 rounded-full text-sm font-semibold ${
      item.status === "Pending"
        ? "bg-yellow-100 text-yellow-800"
        : item.status === "In Process"
        ? "bg-blue-100 text-blue-700"
        : item.status === "Approved"
        ? "bg-green-100 text-green-700"
        : item.status === "Rejected"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-700"
    }`}
  >
    {item.status || "Pending"}
  </span>
</td>

                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-3">
                        <a
                          href={item.fileURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
                        >
                          View
                        </a>

                        <button
                          onClick={() =>
                            window.open(item.fileURL, "_blank")
                          }
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition"
                        >
                          Re-Submit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center text-gray-400 py-8"
                  >
                    No uploaded documents yet.d
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
