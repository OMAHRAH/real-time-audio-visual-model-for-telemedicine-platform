import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { isPatientUser } from "./auth";
import PatientLayout from "./components/PatientLayout";
import BookAppointment from "./pages/BookAppointment";
import Chat from "./pages/Chat";
import MyAppointments from "./pages/MyAppointments";
import MyVitals from "./pages/MyVitals";
import Login from "./pages/Login";
import MedicalProfile from "./pages/MedicalProfile";
import Notifications from "./pages/Notifications";
import Register from "./pages/Register";
import Dashboard from "./pages/PatientDashboard";

const ProtectedRoute = ({ children }) => {
  return isPatientUser() ? children : <Navigate to="/login" replace />;
};

function App() {
  const isAuthenticated = isPatientUser();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
        />

        <Route
          element={
            <ProtectedRoute>
              <PatientLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/appointments" element={<MyAppointments />} />
          <Route path="/appointments/new" element={<BookAppointment />} />
          <Route path="/profile" element={<MedicalProfile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/vitals" element={<MyVitals />} />
          <Route path="/chat" element={<Chat />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
