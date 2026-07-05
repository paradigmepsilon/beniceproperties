// client/src/components/scroll-to-top.tsx
// Reset scroll to the top on every route change. Wouter does no scroll
// restoration, so an SPA history push otherwise keeps the previous page's
// scroll position — a guest who navigates from deep in one page would land
// mid-page on the next. Rendered once inside the router. Renders nothing.

import { useEffect } from "react";
import { useLocation } from "wouter";

export function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}
