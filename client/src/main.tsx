import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register the PWA service worker in production only. In dev, an active SW
// serves a stale precached HTML/JS shell in front of Vite, which forces a
// hard refresh to see changes. Keep it out of the dev loop entirely.
if (import.meta.env.PROD) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
