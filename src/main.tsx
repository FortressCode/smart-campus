import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/custom.css";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ConfirmProvider } from "./contexts/ConfirmContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </NotificationProvider>
    </AuthProvider>
  </React.StrictMode>
);
