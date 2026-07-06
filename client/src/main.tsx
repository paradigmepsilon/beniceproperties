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
} else if ("serviceWorker" in navigator) {
  // A SW installed by an earlier build (when the PWA still ran in dev) keeps
  // controlling this origin and serves its stale precached shell in front of
  // Vite — that's the blank-page-until-hard-refresh bug. Not registering a new
  // SW isn't enough; the zombie must be actively removed. Unregister any
  // existing worker and purge its caches so a normal refresh renders again.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  if (window.caches) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key);
      }
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
