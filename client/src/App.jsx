import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { isDoctorUser } from "./auth";
import { getCurrentUser } from "./auth";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPatientProfile from "./pages/AdminPatientProfile";
import Dashboard from "./pages/dashboard.jsx";
import Login from "./pages/Login";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";

const ProtectedRoute = ({ children }) => {
  return isDoctorUser() ? children : <Navigate to="/login" replace />;
};

function App() {
  const isAuthenticated = isDoctorUser();
  const currentUser = getCurrentUser();
  const homeDashboard =
    currentUser?.role === "admin" ? <AdminDashboard /> : <Dashboard />;

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {homeDashboard}
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/patients/:id"
          element={
            <ProtectedRoute>
              {currentUser?.role === "admin" ? (
                <AdminPatientProfile />
              ) : (
                <Navigate to="/" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
