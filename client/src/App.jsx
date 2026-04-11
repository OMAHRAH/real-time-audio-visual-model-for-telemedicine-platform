import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { isDoctorUser } from "./auth";
import Dashboard from "./pages/dashboard.jsx";
import Login from "./pages/Login";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";

const ProtectedRoute = ({ children }) => {
  return isDoctorUser() ? children : <Navigate to="/login" replace />;
};

function App() {
  const isAuthenticated = isDoctorUser();

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
              <Dashboard />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
