// client/src/App.tsx
// Wouter router root + providers. Mirrors the TRAD app's structure. Routes are
// added per-phase; Phase 1 ships Home + a 404 catch-all.

import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ScrollToTop } from "@/components/scroll-to-top";
import { capturePageview } from "@/lib/analytics";
import Home from "@/pages/home";
import Str from "@/pages/str";
import Ltr from "@/pages/ltr";
import PropertyDetail from "@/pages/property-detail";
import RoomDetail from "@/pages/room-detail";
import Checkout from "@/pages/checkout";
import LeaseBooking from "@/pages/lease-booking";
import LeaseSign from "@/pages/lease-sign";
import LeasePay from "@/pages/lease-pay";
import Portal from "@/pages/portal";
import Confirmation from "@/pages/confirmation";
import BookingLookup from "@/pages/booking-lookup";
import Community from "@/pages/community";
import Partner from "@/pages/partner";
import Journal from "@/pages/journal";
import JournalArticle from "@/pages/journal-article";
import About from "@/pages/about";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import NotFound from "@/pages/not-found";
import { ComingSoon } from "@/pages/coming-soon";
import { useSiteConfig } from "@/lib/useSiteConfig";

// LTR segment (amber) and Journal accent gradients, reused for their Coming-soon
// placeholders so a hidden page still reads in its section color.
const LTR_GRADIENT = "linear-gradient(135deg, #cf9b52, #8a5a1f)";
const JOURNAL_GRADIENT = "linear-gradient(135deg, #3f5c6b, #223743)";

// Visibility gates: render the real page when its flag is on, otherwise the
// branded Coming-soon placeholder. Flags default to visible (fail-open), so
// while config loads the real page shows — no flash of "Coming soon" on a page
// that's actually live.
function LtrGate() {
  const { config } = useSiteConfig();
  return config.pages.ltr ? (
    <Ltr />
  ) : (
    <ComingSoon
      eyebrow="Long-term rentals"
      title="Long-term homes are coming soon."
      subtitle="We're getting our long-term listings ready. Tell us what you're looking for and we'll follow up directly."
      accent={LTR_GRADIENT}
      path="/ltr"
      seoTitle="Long-Term Rentals — Coming Soon | Be Nice Properties"
      seoDescription="Our long-term furnished home rentals are coming soon. Reach out and we'll help you directly in the meantime."
    />
  );
}

function JournalGate({ children }: { children: React.ReactNode }) {
  const { config } = useSiteConfig();
  return config.pages.journal ? (
    <>{children}</>
  ) : (
    <ComingSoon
      eyebrow="Journal"
      title="The Journal is coming soon."
      subtitle="We're writing the stories, guides, and neighborhood notes that will live here. Check back shortly."
      accent={JOURNAL_GRADIENT}
      path="/journal"
      seoTitle="Journal — Coming Soon | Be Nice Properties"
      seoDescription="The Be Nice Properties journal is coming soon — stories, guides, and neighborhood notes for our guests and residents."
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/str" component={Str} />
      {/* LTR + Journal are gated by UO-controlled visibility flags; when off they
          render a branded "Coming soon" placeholder (see App gates above). */}
      <Route path="/ltr" component={LtrGate} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/room/:id" component={RoomDetail} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/lease" component={LeaseBooking} />
      <Route path="/lease/sign" component={LeaseSign} />
      <Route path="/lease/pay" component={LeasePay} />
      <Route path="/portal/:token" component={Portal} />
      <Route path="/confirmation/:reference" component={Confirmation} />
      <Route path="/lookup" component={BookingLookup} />
      <Route path="/community" component={Community} />
      <Route path="/partner" component={Partner} />
      {/* Specific slug route BEFORE the index so wouter's first-match Switch
          doesn't let "/journal" swallow "/journal/:slug". Both are wrapped in the
          Journal visibility gate so the whole section (index + articles) hides
          together when the flag is off. */}
      <Route path="/journal/:slug">
        <JournalGate>
          <JournalArticle />
        </JournalGate>
      </Route>
      <Route path="/journal">
        <JournalGate>
          <Journal />
        </JournalGate>
      </Route>
      <Route path="/about" component={About} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Fires a PostHog $pageview whenever the SPA route changes. A single-page app
// has no full page loads for PostHog to hook, so we drive pageviews off Wouter's
// location. No-ops until analytics is initialized (key present, not prerender).
function AnalyticsPageviews() {
  const [location] = useLocation();
  useEffect(() => {
    capturePageview(location);
  }, [location]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScrollToTop />
      <AnalyticsPageviews />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}
