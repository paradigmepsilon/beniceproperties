// client/src/App.tsx
// Wouter router root + providers. Mirrors the TRAD app's structure. Routes are
// added per-phase; Phase 1 ships Home + a 404 catch-all.

import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ScrollToTop } from "@/components/scroll-to-top";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/str" component={Str} />
      <Route path="/ltr" component={Ltr} />
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
          doesn't let "/journal" swallow "/journal/:slug". */}
      <Route path="/journal/:slug" component={JournalArticle} />
      <Route path="/journal" component={Journal} />
      <Route path="/about" component={About} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScrollToTop />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}
