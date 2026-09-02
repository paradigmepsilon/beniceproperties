// client/src/pages/admin/blocks-panel.tsx
// Task 8 — manual blocks panel, rendered at the top of the Inventory tab.
// Owner/admin-entered unavailability (off-platform bookings, maintenance,
// owner use) that the availability engine already honors (Task 2/3). end_date
// is EXCLUSIVE (the first free day) — labelled "Free from" throughout, to
// match the schema comment and the guest-facing availability semantics.
//
//   GET    /api/admin/blocks?propertyId=   -> { blocks: [...] }
//   POST   /api/admin/blocks                -> block
//   DELETE /api/admin/blocks/:id            -> { ok: true } (404 if unknown)

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Room } from "@shared/schema";
import { MANUAL_BLOCK_KINDS } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fullDate } from "@/lib/format";
import { validateBlockForm } from "@/lib/blockForm";

interface ManualBlockRow {
  id: string;
  propertyId: string;
  roomId: string | null;
  startDate: string;
  endDate: string;
  kind: string;
  note: string | null;
  guestName: string | null;
  source: "ADMIN" | "UO";
  createdBy: string | null;
  createdAt: string;
}

const KIND_LABEL: Record<string, string> = {
  OFF_PLATFORM_BOOKING: "Off-platform booking",
  MAINTENANCE: "Maintenance",
  OWNER_USE: "Owner use",
  OTHER: "Other",
};

function propertyLabel(properties: Property[], propertyId: string): string {
  return properties.find((p) => p.id === propertyId)?.name ?? "Unknown listing";
}

// Resolves a block's room to a name. Reuses the same query key the Inventory
// tab's room editor already uses, so the two share a cache entry.
function RoomLabel({ propertyId, roomId }: { propertyId: string; roomId: string | null }) {
  const rooms = useQuery<Room[]>({
    queryKey: [`/api/admin/properties/${propertyId}/rooms`],
    enabled: !!roomId,
  });
  if (!roomId) return <>Whole property</>;
  const room = rooms.data?.find((r) => r.id === roomId);
  return <>{room ? room.name : "Room"}</>;
}

export default function BlocksPanel({ properties }: { properties: Property[] }) {
  const { toast } = useToast();

  const blocks = useQuery<{ blocks: ManualBlockRow[] }>({
    queryKey: ["/api/admin/blocks"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/blocks")).json(),
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/blocks/${id}`),
    onSuccess: () => {
      toast({ title: "Block removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blocks"] });
    },
    onError: (e: Error) => {
      // A 404 means it's already gone — refresh the list rather than treat it as a failure.
      if (e.message.startsWith("404")) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/blocks"] });
        return;
      }
      toast({ title: "Could not remove block", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Manual blocks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <BlockForm properties={properties} />

        <div className="divide-y text-sm">
          {blocks.data?.blocks.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3" data-testid={`block-${b.id}`}>
              <div>
                <div className="font-medium">
                  {propertyLabel(properties, b.propertyId)} · <RoomLabel propertyId={b.propertyId} roomId={b.roomId} />
                </div>
                <div className="text-muted-foreground">
                  {fullDate(b.startDate)} → free from {fullDate(b.endDate)} · {KIND_LABEL[b.kind] ?? b.kind}
                  {b.guestName ? ` · ${b.guestName}` : ""}
                </div>
                {b.note && <div className="text-xs text-muted-foreground">{b.note}</div>}
                <div className="text-xs text-muted-foreground">
                  {b.source} · {b.createdBy ?? "—"}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={deleteBlock.isPending}
                onClick={() => deleteBlock.mutate(b.id)}
                data-testid={`button-delete-block-${b.id}`}
              >
                Delete
              </Button>
            </div>
          ))}
          {blocks.isLoading && <p className="py-4 text-muted-foreground">Loading…</p>}
          {blocks.data && !blocks.data.blocks.length && <p className="py-4 text-muted-foreground">No manual blocks.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function BlockForm({ properties }: { properties: Property[] }) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [kind, setKind] = useState<string>(MANUAL_BLOCK_KINDS[0]);
  const [note, setNote] = useState("");
  const [guestName, setGuestName] = useState("");

  const property = properties.find((p) => p.id === propertyId);
  const isColiving = property?.type === "COLIVING";

  const rooms = useQuery<Room[]>({
    queryKey: [`/api/admin/properties/${propertyId}/rooms`],
    enabled: !!propertyId && isColiving,
  });

  function selectProperty(id: string) {
    setPropertyId(id);
    setRoomId(null);
  }

  const validation = validateBlockForm({ propertyId, roomId, isColiving, startDate, endDate, kind });

  const create = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/blocks", {
        propertyId,
        roomId: isColiving ? roomId : null,
        startDate,
        endDate,
        kind,
        note: note.trim() || undefined,
        guestName: guestName.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Block added" });
      setStartDate("");
      setEndDate("");
      setNote("");
      setGuestName("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blocks"] });
    },
    onError: (e: Error) => toast({ title: "Could not add block", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-md border border-dashed p-3">
      <div className="mb-3 text-xs font-medium text-muted-foreground">Add manual block</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Listing</Label>
          <Select value={propertyId} onValueChange={selectProperty}>
            <SelectTrigger data-testid="select-block-property">
              <SelectValue placeholder="Choose a listing" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Room</Label>
          {!property ? (
            <p className="pt-2 text-sm text-muted-foreground">Choose a listing first.</p>
          ) : !isColiving ? (
            <p className="pt-2 text-sm text-muted-foreground">Whole property</p>
          ) : (
            <Select value={roomId ?? ""} onValueChange={setRoomId}>
              <SelectTrigger data-testid="select-block-room">
                <SelectValue placeholder="Choose a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.data?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.roomNumber ? ` (#${r.roomNumber})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label className="text-xs">Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-block-start" />
        </div>
        <div>
          <Label className="text-xs">Free from (first free day)</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="input-block-end" />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger data-testid="select-block-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_BLOCK_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k] ?? k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Guest name (optional)</Label>
          <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} data-testid="input-block-guest-name" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-block-note" />
        </div>
      </div>
      {!validation.valid && (propertyId || startDate || endDate) && (
        <p className="mt-2 text-xs text-destructive">{validation.error}</p>
      )}
      <Button
        className="mt-3"
        size="sm"
        disabled={!validation.valid || create.isPending}
        onClick={() => create.mutate()}
        data-testid="button-add-block"
      >
        Add block
      </Button>
    </div>
  );
}
