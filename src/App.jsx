import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Public Pages
import Home from "./pages/Home";
import Announcements from "./pages/Announcements";
import About from "./pages/About";
import Reports from "./pages/Reports";
import Evaluation from "./pages/Evaluation";
import Login from "./pages/Login";
 
// Admin Pages (FIXED FOLDER CASE)
import Terms from "./AdminDashboard/Terms";
import Homepage from "./AdminDashboard/Homepage";

/* AUTH CHECK */
const isLoggedIn = () => localStorage.getItem("isLoggedIn") === "true";
const hasAcceptedTerms = () => localStorage.getItem("acceptedTerms") === "true";

/* PROTECTED ROUTE */
function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  if (!hasAcceptedTerms()) return <Navigate to="/terms" />;
  return children;
}

/* TERMS ROUTE GUARD */
function TermsRoute() {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  if (hasAcceptedTerms()) return <Navigate to="/admin/homepage" />;
  return <Terms />;
}

/* LAYOUT WRAPPER */
function LayoutWrapper() {
  const location = useLocation();

  const isAdminRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/terms";

  return (
    <div className="flex flex-col min-h-screen">
      {!isAdminRoute && <Navbar />}

      <main className="flex-1">
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/about" element={<About />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/evaluation" element={<Evaluation />} />

          {/* LOGIN */}
          <Route
            path="/login"
            element={
              isLoggedIn()
                ? hasAcceptedTerms()
                  ? <Navigate to="/admin/homepage" />
                  : <Navigate to="/terms" />
                : <Login />
            }
          />

          {/* TERMS */}
          <Route path="/terms" element={<TermsRoute />} />

          {/* ADMIN ROUTES */}

          <Route path="/admin/homepage" element={<ProtectedRoute><Homepage /></ProtectedRoute>} />

          <Route path="/admin/fill-up-form" element={<ProtectedRoute><Homepage page="fill-up-form" /></ProtectedRoute>} />

          <Route path="/admin/written-warning" element={<ProtectedRoute><Homepage page="written-warning" /></ProtectedRoute>} />

          <Route path="/admin/1st-offense" element={<ProtectedRoute><Homepage page="1st-offense" /></ProtectedRoute>} />

          <Route path="/admin/2nd-offense" element={<ProtectedRoute><Homepage page="2nd-offense" /></ProtectedRoute>} />

          <Route path="/admin/3rd-offense" element={<ProtectedRoute><Homepage page="3rd-offense" /></ProtectedRoute>} />

          <Route path="/admin/article7" element={<ProtectedRoute><Homepage page="article7" /></ProtectedRoute>} />

          <Route path="/admin/article10" element={<ProtectedRoute><Homepage page="article10" /></ProtectedRoute>} />

          <Route path="/admin/approval-case" element={<ProtectedRoute><Homepage page="approval-case" /></ProtectedRoute>} />

          <Route path="/admin/total-case-2025" element={<ProtectedRoute><Homepage page="total-case-2025" /></ProtectedRoute>} />

          <Route path="/admin/lost-found" element={<ProtectedRoute><Homepage page="lost-found" /></ProtectedRoute>} />
          
          

          {/* SMART FALLBACK */}
          <Route
            path="*"
            element={
              <Navigate to={isLoggedIn() ? "/admin/homepage" : "/"} />
            }
          />

        </Routes>
      </main>

      {!isAdminRoute && <Footer />}
    </div>
  );
}

/* APP */
function App() {
  return (
    <Router>
      <LayoutWrapper />
    </Router>
  );
}

export default App;