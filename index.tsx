import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// PWA: register service worker on web builds (skip file:// protocol for Electron)
import { registerSW } from "virtual:pwa-register";

const isElectron = /electron/i.test(navigator.userAgent);
if ("serviceWorker" in navigator && window.location.protocol !== "file:" && !isElectron) {
  registerSW({ immediate: true });
}

const el = document.getElementById("root");
if (!el) throw new Error("Root element #root not found");

ReactDOM.createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
