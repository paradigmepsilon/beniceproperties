// client/src/App.tsx
// Wouter router root + providers. Mirrors the TRAD app's structure. Routes are
// added per-phase; Phase 1 ships Home + a 404 catch-all.

import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import PropertyDetail from "@/pages/property-detail";
import RoomDetail from "@/pages/room-detail";
import Checkout from "@/pages/checkout";
import Confirmation from "@/pages/confirmation";
import BookingLookup from "@/pages/booking-lookup";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/room/:id" component={RoomDetail} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/confirmation/:reference" component={Confirmation} />
      <Route path="/lookup" component={BookingLookup} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}
