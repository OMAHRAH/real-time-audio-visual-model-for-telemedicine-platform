import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import MyVitals from "./pages/MyVitals";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
<Route path="/vitals" element={<MyVitals />} />