import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./pages/App.jsx";
import { AuthProvider } from "./state/AuthContext.jsx";
import "./styles.css";

const canonical = import.meta.env.VITE_APP_CANONICAL_ORIGIN;
if (canonical && typeof window !== "undefined") {
  try {
    const target = new URL(canonical);
    if (window.location.origin !== target.origin) {
      target.pathname = window.location.pathname;
      target.search = window.location.search;
      target.hash = window.location.hash;
      window.location.replace(target.toString());
      throw 0;
    }
  } catch (e) {
    if (e === 0) throw e;
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

