import { Navigate } from "react-router-dom";

export default function RoleProtectedRoute({ allowedRoles, children }) {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");

  if (!isLoggedIn || !currentUser) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}