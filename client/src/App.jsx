import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/dashboard.jsx";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientProfile />} />
      </Routes>
    </Router>
  );
}

export default App;
