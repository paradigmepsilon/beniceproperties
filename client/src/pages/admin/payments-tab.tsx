// client/src/pages/admin/payments-tab.tsx
// =============================================================================
// Money read as Property -> Room -> Guest stay -> individual line.
//
// It replaced a flat list of one card per booking whose only handle was a
// reference string: an operator could see "WEEKLY · STRIPE ‖ $362.25 · PAID" and
// had no way to tell which guest, which home, or which room it belonged to.
// Recurring co-living rent was not on the screen at all, because it lives in
// payment_schedule (lease-keyed) rather than payments (booking-keyed).
//
// Its own file, following the MessagesTab / StayApprovalsTab extraction
// precedent, so dashboard.tsx's diff stays at two hunks.
//
// All grouping, attribution and totalling happens server-side in
// server/lib/paymentsByProperty.ts. This file only maps and renders — partly to
// keep it short, but mainly because nothing here can be tested (vitest runs
// environment:"node" with no jsdom), so no decision worth verifying belongs in it.
//
// Read-only by design. The Reconciliation tab still owns "Mark paid"; a
// legibility fix is the wrong place to add a money action.
// =============================================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money, dateTime } from "@/lib/format";
import { statusVariant, statusClass } from "@/lib/statusBadge";
import { cleanError } from "@/lib/portalFetch";
import type {
  MoneyLine,
  MoneyTotals,
  PaymentsByPropertyView,
  PropertyMoney,
  RoomMoney,
  StayMoney,
} from "@shared/api-types";

const PAYMENTS_BY_PROPERTY_KEY = "/api/admin/payments/by-property";

/** Expansion keys, so the Set can hold all three levels without collision. */
const propKey = (id: string) => `prop:${id}`;
const roomKey = (propertyId: string, roomId: string | null) =>
  `room:${propertyId}:${roomId ?? "whole"}`;
const stayKey = (kind: string, id: string) => `stay:${kind}:${id}`;

export default function PaymentsTab() {
  const { data, isLoading, isError, error } = useQuery<PaymentsByPropertyView>({
    queryKey: [PAYMENTS_BY_PROPERTY_KEY],
  });

  // Properties and rooms open by default, individual money lines closed: for a
  // real portfolio that answers "which room, which guest, how much" with no
  // clicks, and any single payment is one click away. A Set (not a single id) so
  // two homes can be open side by side.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const isOpen = (key: string) => !collapsed.has(key);
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // Money lines are the inverse: closed unless explicitly opened.
  const [openStays, setOpenStays] = useState<Set<string>>(new Set());
  const toggleStay = (key: string) =>
    setOpenStays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  function collapseAll() {
    const keys = new Set<string>();
    for (const p of data?.properties ?? []) {
      keys.add(propKey(p.propertyId));
      for (const r of p.rooms) keys.add(roomKey(p.propertyId, r.roomId));
    }
    setCollapsed(keys);
    setOpenStays(new Set());
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Payments by property</CardTitle>
            {data && (
              <p className="mt-1 text-xs text-muted-foreground" data-testid="text-as-of">
                as of {dateTime(data.asOf)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data && <Totals totals={data.grand} prefix="grand" />}
            <Button
              size="sm"
              variant="outline"
              onClick={collapseAll}
              data-testid="button-collapse-all"
            >
              Collapse all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="py-4 text-muted-foreground">Loading…</p>}
        {isError && (
          <p className="py-4 text-destructive" data-testid="text-payments-error">
            Could not load payments. {cleanError(error)}
          </p>
        )}
        {data && data.properties.length === 0 && (
          <p className="py-4 text-muted-foreground">No properties yet.</p>
        )}

        <div className="divide-y text-sm" data-testid="list-payments-by-property">
          {data?.properties.map((p) => (
            <PropertyBlock
              key={p.propertyId}
              property={p}
              open={isOpen(propKey(p.propertyId))}
              onToggle={() => toggle(propKey(p.propertyId))}
              isRoomOpen={(roomId) => isOpen(roomKey(p.propertyId, roomId))}
              onToggleRoom={(roomId) => toggle(roomKey(p.propertyId, roomId))}
              isStayOpen={(stay) => openStays.has(stayKey(stay.kind, stay.id))}
              onToggleStay={(stay) => toggleStay(stayKey(stay.kind, stay.id))}
            />
          ))}
        </div>

        {data && data.unattributed.stays.length > 0 && (
          <div className="mt-6 rounded-md border border-destructive/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-destructive">
                Unattributed money ({data.unattributed.stays.length})
              </span>
              <Totals totals={data.unattributed.totals} prefix="unattributed" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              These payments belong to a booking or lease whose guest or property record is
              missing, so they cannot be placed under a room. They are included in the totals
              above.
            </p>
            <div className="mt-2 divide-y">
              {data.unattributed.stays.map((s) => (
                <StayRow
                  key={`${s.kind}:${s.id}`}
                  stay={s}
                  open={openStays.has(stayKey(s.kind, s.id))}
                  onToggle={() => toggleStay(stayKey(s.kind, s.id))}
                />
              ))}
            </div>
          </div>
        )}

        {data && <ExcludedFooter excluded={data.excluded} />}
      </CardContent>
    </Card>
  );
}

/** The same four numbers at every level, so the eye learns one shape. */
function Totals({ totals, prefix }: { totals: MoneyTotals; prefix: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span data-testid={`text-${prefix}-collected`}>
        <strong>{money(totals.collected)}</strong> collected
      </span>
      {totals.scheduled > 0 && (
        <span className="text-muted-foreground" data-testid={`text-${prefix}-scheduled`}>
          {money(totals.scheduled)} scheduled
        </span>
      )}
      {totals.overdue > 0 && (
        <span className="font-medium text-destructive" data-testid={`text-${prefix}-overdue`}>
          {money(totals.overdue)} overdue
        </span>
      )}
      {totals.lateFees > 0 && (
        <span className="font-medium text-destructive" data-testid={`text-${prefix}-latefees`}>
          {money(totals.lateFees)} late fees
        </span>
      )}
      {totals.refunded > 0 && (
        <span className="text-muted-foreground" data-testid={`text-${prefix}-refunded`}>
          {money(totals.refunded)} refunded
        </span>
      )}
    </span>
  );
}

function Caret({ open }: { open: boolean }) {
  return <span aria-hidden="true">{open ? "▾" : "▸"}</span>;
}

const propertyTypeLabel = (type: string) =>
  type === "STR" ? "Whole property" : type === "COLIVING" ? "By the room" : type;

function PropertyBlock({
  property,
  open,
  onToggle,
  isRoomOpen,
  onToggleRoom,
  isStayOpen,
  onToggleStay,
}: {
  property: PropertyMoney;
  open: boolean;
  onToggle: () => void;
  isRoomOpen: (roomId: string | null) => boolean;
  onToggleRoom: (roomId: string | null) => void;
  isStayOpen: (stay: StayMoney) => boolean;
  onToggleStay: (stay: StayMoney) => void;
}) {
  return (
    <div className="py-3" data-testid={`row-property-${property.propertyId}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          className="text-left"
          aria-expanded={open}
          onClick={onToggle}
          data-testid={`button-expand-property-${property.propertyId}`}
        >
          <div className="font-medium">
            <Caret open={open} /> {property.propertyName}
            {!property.active && (
              <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {property.location} · {propertyTypeLabel(property.type)} · {property.entity} ·{" "}
            {property.stayCount} {property.stayCount === 1 ? "stay" : "stays"}
          </div>
        </button>
        <Totals totals={property.totals} prefix={`property-${property.propertyId}`} />
      </div>

      {open && (
        <div className="mt-2 divide-y border-t pl-4">
          {property.rooms.map((room) => (
            <RoomBlock
              key={room.roomId ?? "whole"}
              propertyId={property.propertyId}
              room={room}
              open={isRoomOpen(room.roomId)}
              onToggle={() => onToggleRoom(room.roomId)}
              isStayOpen={isStayOpen}
              onToggleStay={onToggleStay}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomBlock({
  propertyId,
  room,
  open,
  onToggle,
  isStayOpen,
  onToggleStay,
}: {
  propertyId: string;
  room: RoomMoney;
  open: boolean;
  onToggle: () => void;
  isStayOpen: (stay: StayMoney) => boolean;
  onToggleStay: (stay: StayMoney) => void;
}) {
  return (
    <div className="py-2" data-testid={`row-room-${propertyId}-${room.roomId ?? "whole"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="text-left"
          aria-expanded={open}
          onClick={onToggle}
          data-testid={`button-expand-room-${propertyId}-${room.roomId ?? "whole"}`}
        >
          <span className="font-medium">
            <Caret open={open} /> {room.roomNumber ? `#${room.roomNumber} · ` : ""}
            {room.roomName}
          </span>
          {room.roomStatus && (
            <Badge
              variant={statusVariant(room.roomStatus)}
              className={`ml-2 ${statusClass(room.roomStatus) ?? ""}`}
            >
              {room.roomStatus}
            </Badge>
          )}
        </button>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Totals totals={room.totals} prefix={`room-${room.roomId ?? "whole"}`} />
          {room.sharedTotals.collected > 0 && (
            <span
              className="text-xs text-muted-foreground"
              data-testid={`text-shared-${room.roomId ?? "whole"}`}
            >
              + {money(room.sharedTotals.collected)} shared
            </span>
          )}
        </span>
      </div>

      {open && (
        <div className="mt-1 divide-y pl-4">
          {room.stays.length === 0 && (
            <p className="py-2 text-xs text-muted-foreground">No payments recorded.</p>
          )}
          {room.stays.map((stay) => (
            <StayRow
              key={`${stay.kind}:${stay.id}`}
              stay={stay}
              open={isStayOpen(stay)}
              onToggle={() => onToggleStay(stay)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StayRow({
  stay,
  open,
  onToggle,
}: {
  stay: StayMoney;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="py-2" data-testid={`row-stay-${stay.kind}-${stay.id}`}>
      <button
        type="button"
        className="w-full text-left"
        aria-expanded={open}
        onClick={onToggle}
        data-testid={`button-expand-stay-${stay.id}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            <Caret open={open} /> <span className="font-mono">{stay.handle}</span>
            <span className="ml-2 text-muted-foreground">
              {stay.guestName}
              {stay.guestEmail ? ` · ${stay.guestEmail}` : ""} · {stay.start}
              {stay.end ? ` → ${stay.end}` : ""}
              {stay.cadence ? ` · ${stay.cadence}` : ""}
            </span>
            <Badge
              variant={statusVariant(stay.status)}
              className={`ml-2 ${statusClass(stay.status) ?? ""}`}
            >
              {stay.status}
            </Badge>
          </span>
          <span className="whitespace-nowrap">
            <strong>{money(stay.totals.collected)}</strong>
            <span className="text-muted-foreground"> of {money(stay.totals.expected)}</span>
            {stay.totals.overdue > 0 && (
              <span className="ml-2 font-medium text-destructive">
                {money(stay.totals.overdue)} overdue
              </span>
            )}
          </span>
        </div>

        {/* A lease spanning several rooms is listed under each of them, so say so
            here — otherwise the same money looks like it was counted twice. */}
        {stay.multiRoom && (
          <div className="text-xs text-muted-foreground" data-testid={`text-multiroom-${stay.id}`}>
            Shared lease · {stay.rooms.length} rooms ({stay.rooms.map((r) => r.name).join(", ")})
          </div>
        )}
      </button>

      {open && (
        <div className="mt-1 space-y-0.5 pl-4" data-testid={`list-stay-lines-${stay.id}`}>
          {stay.lines.map((line) => (
            <LineRow key={line.id} line={line} />
          ))}
        </div>
      )}
    </div>
  );
}

function LineRow({ line }: { line: MoneyLine }) {
  const missing = line.kind === "MISSING";
  // Shown but in no total: a waived row, a legacy subscription, or an unpaid row
  // on a cancelled/abandoned/finished stay. Struck through so the eye can tell
  // at a glance which figures the totals above are actually built from.
  const uncounted = !line.counted && !missing;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2${uncounted ? " text-muted-foreground" : ""}`}
      data-testid={`row-line-${line.id}`}
    >
      <span className={missing ? "text-destructive" : undefined}>
        {line.scheduleSeq !== null && (
          <span className="text-muted-foreground">#{line.scheduleSeq} </span>
        )}
        {line.label}
        {line.dueDate && <span className="ml-2 text-muted-foreground">{line.dueDate}</span>}
        {line.method === "MANUAL" && (
          <span className="ml-2 text-xs text-muted-foreground">(manual)</span>
        )}
      </span>
      <span className="flex items-center gap-2 whitespace-nowrap">
        {!missing && (
          <span className={uncounted ? "line-through" : undefined}>{money(line.amount)}</span>
        )}
        {uncounted && (
          <span className="text-xs" data-testid={`text-uncounted-${line.id}`}>
            not expected
          </span>
        )}
        {line.surcharge !== null && line.surcharge > 0 && (
          <span className="text-xs text-muted-foreground">
            incl. {money(line.surcharge)} surcharge
          </span>
        )}
        <Badge variant={statusVariant(line.status)} className={statusClass(line.status)}>
          {line.status}
        </Badge>
      </span>
    </div>
  );
}

function ExcludedFooter({ excluded }: { excluded: PaymentsByPropertyView["excluded"] }) {
  const parts: string[] = [];
  if (excluded.abandonedCheckouts > 0) {
    parts.push(
      `${excluded.abandonedCheckouts} abandoned checkout${excluded.abandonedCheckouts === 1 ? "" : "s"} (started, never paid)`,
    );
  }
  if (excluded.draftLeases > 0) {
    parts.push(`${excluded.draftLeases} draft lease${excluded.draftLeases === 1 ? "" : "s"}`);
  }
  if (excluded.agedOut > 0) {
    parts.push(`${excluded.agedOut} finished over a year ago`);
  }
  if (excluded.placeholderProperties > 0) {
    parts.push(
      `${excluded.placeholderProperties} placeholder listing${excluded.placeholderProperties === 1 ? "" : "s"}`,
    );
  }
  if (parts.length === 0) return null;
  return (
    <p className="mt-4 border-t pt-3 text-xs text-muted-foreground" data-testid="text-excluded">
      Not shown: {parts.join(" · ")}.
    </p>
  );
}
