import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
// Self-hosted webfont, bundled with the app (no external font CDN at
// runtime, no licensing risk to redistribute -- Arimo is Google's
// open-source, metrically-close substitute for Arial/Helvetica). Only the
// three weights the app actually uses (300/500/700) are imported.
import "@fontsource/arimo/300.css";
import "@fontsource/arimo/500.css";
import "@fontsource/arimo/700.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
