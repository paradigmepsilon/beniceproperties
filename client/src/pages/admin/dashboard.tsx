// client/src/pages/admin/dashboard.tsx
// Auth-gated admin console. Tabs: Overview, Reconciliation, Inventory, Payments.
// Guards by querying /api/admin/me; on 401 it redirects to /admin/login.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import type { Booking, Property, Room, Payment, Subscription } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/format";

interface Dashboard {
  aggregates: {
    bookingCount: number;
    occupancyPct: number;
    revenueTotal: number;
    roomsOccupied: number;
    upcomingCheckIns: number;
  };
  recentBookings: Booking[];
  pendingCount: number;
}

interface ReconRow {
  payment: Payment;
  booking: Booking | undefined;
  guest: { name: string; email: string } | null;
}

interface PaymentRow {
  booking: Booking;
  payments: Payment[];
  subscription: Subscription | undefined;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const me = useQuery({
    queryKey: ["/api/admin/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  useEffect(() => {
    if (!me.isLoading && !me.data) navigate("/admin/login");
  }, [me.isLoading, me.data, navigate]);

  const dashboard = useQuery<Dashboard>({ queryKey: ["/api/admin/dashboard"], enabled: !!me.data });
  const recon = useQuery<ReconRow[]>({ queryKey: ["/api/admin/reconciliation"], enabled: !!me.data });
  const properties = useQuery<Property[]>({ queryKey: ["/api/admin/properties"], enabled: !!me.data });
  const paymentsView = useQuery<PaymentRow[]>({ queryKey: ["/api/admin/payments"], enabled: !!me.data });

  const markPaid = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest("POST", `/api/admin/payments/${paymentId}/mark-paid`);
    },
    onSuccess: () => {
      toast({ title: "Payment marked paid" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const pushKpi = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/kpi/push");
      return res.json();
    },
    onSuccess: () => toast({ title: "KPI snapshot pushed (dry-run unless enabled)" }),
  });

  const logout = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/logout"),
    onSuccess: () => {
      queryClient.clear();
      navigate("/admin/login");
    },
  });

  if (me.isLoading) return <main className="p-12 text-muted-foreground">Loading…</main>;
  if (!me.data) return null;

  const a = dashboard.data?.aggregates;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">BNP Admin</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => pushKpi.mutate()} data-testid="button-push-kpi">
            Push KPI snapshot
          </Button>
          <Button variant="outline" size="sm" onClick={() => logout.mutate()} data-testid="button-logout">
            Sign out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="reconciliation" data-testid="tab-reconciliation">
            Reconciliation
            {dashboard.data?.pendingCount ? ` (${dashboard.data.pendingCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Bookings" value={a?.bookingCount ?? "—"} />
            <Stat label="Occupancy" value={a ? `${a.occupancyPct}%` : "—"} />
            <Stat label="Revenue" value={a ? money(a.revenueTotal) : "—"} />
            <Stat label="Rooms occupied" value={a?.roomsOccupied ?? "—"} />
            <Stat label="Check-ins (7d)" value={a?.upcomingCheckIns ?? "—"} />
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Recent bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y text-sm">
                {dashboard.data?.recentBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2">
                    <span className="font-mono">{b.reference}</span>
                    <span className="text-muted-foreground">
                      {b.model} · {b.paymentMethod}
                    </span>
                    <Badge variant={b.status === "CONFIRMED" || b.status === "ACTIVE" ? "default" : "secondary"}>
                      {b.status}
                    </Badge>
                  </div>
                ))}
                {!dashboard.data?.recentBookings.length && (
                  <p className="py-4 text-muted-foreground">No bookings yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation */}
        <TabsContent value="reconciliation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending manual payments (CashApp / Zelle)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y text-sm">
                {recon.data?.map((row) => (
                  <div key={row.payment.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-mono">{row.booking?.reference}</div>
                      <div className="text-muted-foreground">
                        {row.guest?.name} · {row.guest?.email} · {row.payment.method}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{money(row.payment.amount)}</span>
                      <Button
                        size="sm"
                        disabled={markPaid.isPending}
                        onClick={() => markPaid.mutate(row.payment.id)}
                        data-testid={`button-mark-paid-${row.payment.id}`}
                      >
                        Mark paid
                      </Button>
                    </div>
                  </div>
                ))}
                {!recon.data?.length && <p className="py-4 text-muted-foreground">Nothing to reconcile.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory" className="mt-6">
          <InventoryManager properties={properties.data ?? []} />
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payments &amp; subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                {paymentsView.data?.map((row) => (
                  <div key={row.booking.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{row.booking.reference}</span>
                      <Badge variant="secondary">{row.booking.status}</Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      {row.payments.map((p) => (
                        <div key={p.id} className="flex justify-between text-muted-foreground">
                          <span>{p.type} · {p.method}</span>
                          <span>
                            {money(parseFloat(p.amount) + parseFloat(p.surcharge))} · {p.status}
                          </span>
                        </div>
                      ))}
                      {row.subscription && (
                        <div className="flex justify-between">
                          <span>Weekly subscription</span>
                          <span>
                            {money(row.subscription.weeklyAmount)}/wk · {row.subscription.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!paymentsView.data?.length && <p className="py-4 text-muted-foreground">No payments yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

// --- Inventory management (create property, toggle active/status) ---
function InventoryManager({ properties }: { properties: Property[] }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("Atlanta");
  const [type, setType] = useState<"STR" | "COLIVING">("STR");
  const [basePrice, setBasePrice] = useState("");

  const createProperty = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/properties", {
        name,
        location,
        type,
        description: "",
        basePrice: type === "STR" && basePrice ? basePrice : null,
        cleaningFee: "0",
        active: true,
      });
    },
    onSuccess: () => {
      toast({ title: "Property created" });
      setName("");
      setBasePrice("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Property) => {
      await apiRequest("PATCH", `/api/admin/properties/${p.id}`, { active: !p.active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-property-name" />
          </div>
          <div>
            <Label htmlFor="p-loc">Location</Label>
            <Input id="p-loc" value={location} onChange={(e) => setLocation(e.target.value)} data-testid="input-property-location" />
          </div>
          <div>
            <Label>Type</Label>
            <div className="mt-1 flex gap-2">
              {(["STR", "COLIVING"] as const).map((t) => (
                <Button key={t} type="button" size="sm" variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>
                  {t === "STR" ? "Whole property" : "By the room"}
                </Button>
              ))}
            </div>
          </div>
          {type === "STR" && (
            <div>
              <Label htmlFor="p-price">Nightly base price</Label>
              <Input id="p-price" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="450.00" data-testid="input-property-price" />
            </div>
          )}
          <Button disabled={!name.trim() || createProperty.isPending} onClick={() => createProperty.mutate()} data-testid="button-create-property">
            Create property
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y text-sm">
            {properties.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground">
                    {p.location} · {p.type}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(p)} data-testid={`button-toggle-${p.id}`}>
                  {p.active ? "Active" : "Hidden"}
                </Button>
              </div>
            ))}
            {!properties.length && <p className="py-4 text-muted-foreground">No properties.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
