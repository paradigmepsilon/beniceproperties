// server/lib/paymentMetadata.ts
// =============================================================================
// THE single source of the Stripe Metadata Contract. Every PaymentIntent in BNP
// MUST carry metadata built by this module — a charge with missing/incomplete
// metadata is a bug (PROMPT 0). Building it in one place makes partial population
// impossible.
//
// Contract (PROMPT 0):
//   entity        "TRAD" | "BNP"
//   product_type  "STR_WHOLE" | "COLIVING_ROOM"
//   property_id   uuid
//   property_name human readable
//   room_id       uuid | "null"        (null for whole-property)
//   room_name     string | "null"
//   room_number   string | "null"
//   lease_id      uuid | "null"        (null for STR nightly)
//   payment_kind  BOOKING_DEPOSIT | FIRST_PAYMENT | SCHEDULED_RENT | LATE_FEE | MANUAL_RECONCILE
//   schedule_seq  int | "null"
//
// Stripe metadata values must be strings. We serialise null as the string
// "null" so every key is always present (Stripe drops undefined keys; we never
// want a key silently missing). For multi-room co-living leases the room fields
// are comma-joined.
// =============================================================================

import type { Property, Room, Lease, LeaseRoom } from "@shared/schema";

export type PaymentKind =
  | "BOOKING_DEPOSIT"
  | "FIRST_PAYMENT"
  | "SCHEDULED_RENT"
  | "LATE_FEE"
  | "MANUAL_RECONCILE";

export type ProductType = "STR_WHOLE" | "COLIVING_ROOM";

/** Exact shape of the contract. All values are strings (Stripe requirement). */
export interface StripeChargeMetadata {
  entity: string;
  product_type: ProductType;
  property_id: string;
  property_name: string;
  room_id: string;
  room_name: string;
  room_number: string;
  lease_id: string;
  payment_kind: PaymentKind;
  schedule_seq: string;
  [key: string]: string;
}

const NULL = "null";
const str = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === "" ? NULL : String(v);

/** Map the DB property type ("STR" | "COLIVING") to the contract product_type. */
export function productTypeFor(property: Pick<Property, "type">): ProductType {
  return property.type === "COLIVING" ? "COLIVING_ROOM" : "STR_WHOLE";
}

/**
 * Build metadata for a CO-LIVING lease charge (first payment, scheduled rent,
 * late fee, or manual reconcile). `rooms` are the lease's included rooms (from
 * lease_rooms snapshots); their fields are comma-joined.
 */
export function buildLeaseChargeMetadata(args: {
  entity: string;
  property: Pick<Property, "id" | "name" | "type">;
  lease: Pick<Lease, "id">;
  rooms: Pick<LeaseRoom, "roomId" | "roomNameSnapshot" | "roomNumberSnapshot">[];
  paymentKind: PaymentKind;
  scheduleSeq: number | null;
}): StripeChargeMetadata {
  const roomIds = args.rooms.map((r) => r.roomId).join(",");
  const roomNames = args.rooms.map((r) => r.roomNameSnapshot).join(",");
  const roomNumbers = args.rooms.map((r) => r.roomNumberSnapshot ?? "").join(",");

  return {
    entity: str(args.entity),
    product_type: "COLIVING_ROOM",
    property_id: str(args.property.id),
    property_name: str(args.property.name),
    room_id: str(roomIds),
    room_name: str(roomNames),
    room_number: str(roomNumbers),
    lease_id: str(args.lease.id),
    payment_kind: args.paymentKind,
    schedule_seq: str(args.scheduleSeq),
  };
}

/**
 * Build metadata for a whole-property STR charge. No room, no lease, no schedule.
 */
export function buildStrChargeMetadata(args: {
  entity: string;
  property: Pick<Property, "id" | "name" | "type">;
  paymentKind: Extract<PaymentKind, "BOOKING_DEPOSIT" | "MANUAL_RECONCILE">;
}): StripeChargeMetadata {
  return {
    entity: str(args.entity),
    product_type: "STR_WHOLE",
    property_id: str(args.property.id),
    property_name: str(args.property.name),
    room_id: NULL,
    room_name: NULL,
    room_number: NULL,
    lease_id: NULL,
    payment_kind: args.paymentKind,
    schedule_seq: NULL,
  };
}

/** The contract's required keys — used by the validator + tests. */
export const REQUIRED_METADATA_KEYS = [
  "entity",
  "product_type",
  "property_id",
  "property_name",
  "room_id",
  "room_name",
  "room_number",
  "lease_id",
  "payment_kind",
  "schedule_seq",
] as const;

/**
 * Guardrail: throw if any contract key is missing or empty. Call this right
 * before creating any PaymentIntent so a partially-populated charge can never
 * reach Stripe.
 */
export function assertCompleteMetadata(meta: Record<string, string>): void {
  const missing = REQUIRED_METADATA_KEYS.filter(
    (k) => meta[k] === undefined || meta[k] === "",
  );
  if (missing.length > 0) {
    throw new Error(
      `Stripe metadata contract incomplete — missing/empty: ${missing.join(", ")}`,
    );
  }
}
