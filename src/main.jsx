import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./styles.css";
import App from "./App.jsx";
import NotificationProvider from "./components/notifications/NotificationProvider";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <NotificationProvider>
      <App />
      <Analytics />
    </NotificationProvider>
  </StrictMode>
);
