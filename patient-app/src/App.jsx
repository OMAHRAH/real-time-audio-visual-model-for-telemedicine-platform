import { BrowserRouter,Routes,Route } from "react-router-dom";
import MyVitals from "./pages/MyVitals";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/PatientDashboard";

function App(){

  const token = localStorage.getItem("token");

  return(
    <BrowserRouter>

<Routes>

{!token && (
  <Route path="/" element={<Login/>}/>
)}

{token && (
  <>
    <Route path="/" element={<Dashboard/>}/>
    <Route path="/vitals" element={<MyVitals/>}/>
  </>
)}

</Routes>

    </BrowserRouter>
  )
}

export default App