import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Public Pages
import Home from "./pages/Home";
import Announcements from "./pages/Announcements";
import About from "./pages/About";
import Login from "./pages/Login";

// Admin / Role Pages
import EvaluationResultsPage from "./AdminDashboard/pages/EvaluationResultsPage";
import EvaluationFormPage from "./AdminDashboard/pages/EvaluationFormPage";

import SSCHomepage from "./ssc/sscHomepage";
import SDOHomepage from "./sdo/sdoHomepage";
import SOCHomepage from "./soc/socHomepage";

import Terms from "./AdminDashboard/Terms";
import Homepage from "./AdminDashboard/Homepage";

/* AUTH */
const isLoggedIn = () => localStorage.getItem("isLoggedIn") === "true";
const hasAcceptedTerms = () => localStorage.getItem("acceptedTerms") === "true";

/* PROTECTED ROUTE */
function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  if (!hasAcceptedTerms()) return <Navigate to="/terms" />;
  return children;
}

/* TERMS ROUTE */
function TermsRoute() {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  if (hasAcceptedTerms()) return <Navigate to="/admin/homepage" />;
  return <Terms />;
}

/* LAYOUT WRAPPER */
function LayoutWrapper() {
  const location = useLocation();

  // ✅ PUBLIC ONLY ROUTES
  const isPublicRoute =
    location.pathname === "/" ||
    location.pathname === "/announcements" ||
    location.pathname === "/about";

  const getHomeRoute = () => {
    const role = localStorage.getItem("role");

    switch (role) {
      case "Administrator":
        return "/admin/homepage";
      case "SSC Officer":
        return "/ssc/homepage";
      case "Student Disciplinary Officer":
        return "/sdo/homepage";
      case "Student Organization Coordinator":
        return "/soc/homepage";
      default:
        return "/";
    }
  };

  return (
    <div className="flex flex-col min-h-screen">

      {/* ✅ Navbar ONLY for public routes */}
      {isPublicRoute && <Navbar />}

      <main className="flex-1">
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/about" element={<About />} />

          {/* LOGIN */}
          <Route
            path="/login"
            element={
              isLoggedIn()
                ? hasAcceptedTerms()
                  ? <Navigate to={getHomeRoute()} />
                  : <Navigate to="/terms" />
                : <Login />
            }
          />

          {/* TERMS */}
          <Route path="/terms" element={<TermsRoute />} />

          {/* ADMIN / ROLE ROUTES */}
          <Route
            path="/admin/homepage"
            element={
              <ProtectedRoute>
                <Homepage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ssc/homepage"
            element={
              <ProtectedRoute>
                <SSCHomepage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sdo/homepage"
            element={
              <ProtectedRoute>
                <SDOHomepage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/soc/homepage"
            element={
              <ProtectedRoute>
                <SOCHomepage />
              </ProtectedRoute>
            }
          />

          {/* EVALUATION */}
          <Route path="/evaluation/:eventId" element={<EvaluationFormPage />} />
          <Route path="/evaluation/:id/results" element={<EvaluationResultsPage />} />

          {/* FALLBACK */}
          <Route
            path="*"
            element={
              <Navigate to={isLoggedIn() ? getHomeRoute() : "/"} />
            }
          />

        </Routes>
      </main>

      {/* ✅ Footer ONLY for public routes */}
      {isPublicRoute && <Footer />}

    </div>
  );
}

/* APP */
export default function App() {
  return (
    <Router>
      <LayoutWrapper />
    </Router>
  );
}