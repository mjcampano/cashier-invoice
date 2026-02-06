import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AddStudent from "./components/admin/AddStudent";
import "./styles.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
  <Routes>
    <Route path="/*" element={<App />} />
    <Route path="/admin/add-student" element={<AddStudent />} />
  </Routes>
  </BrowserRouter>
);
