import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
// Self-hosted webfont, bundled with the app (no external font CDN at
// runtime, no licensing risk to redistribute -- Arimo is Google's
// open-source, metrically-close substitute for Arial/Helvetica). Arimo has
// no 300 (light) weight -- Fontsource only ships 400/500/600/700 -- so
// `font-light` (CSS weight 300) elements browser-match to the nearest
// loaded weight below/above; loading 400 here keeps that visibly lighter
// than the 500/700 also loaded, matching the original design intent.
import "@fontsource/arimo/400.css";
import "@fontsource/arimo/500.css";
import "@fontsource/arimo/700.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
