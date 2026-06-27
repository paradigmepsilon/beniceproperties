// server/lib/reconciliation.test.ts
// Phase 9 — reconciliation report over mocked storage. Verifies the
// entity→property→room rollup, rent card-vs-manual split, late-fee attribution,
// date-range filtering, and that grand totals tie out.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLeases: vi.fn(),
  getProperty: vi.fn(),
  getLeaseRooms: vi.fn(),
  getScheduleByLease: vi.fn(),
  getLateFeesByLease: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import { buildReconciliationReport } from "./reconciliation";

const GEN = "2026-08-01T00:00:00.000Z";

beforeEach(() => vi.clearAllMocks());

describe("buildReconciliationReport", () => {
  it("rolls up rent (card vs manual) + late fees by entity→property→room", async () => {
    mockStorage.getLeases.mockResolvedValue([{ id: "lease-1", propertyId: "prop-1" }]);
    mockStorage.getProperty.mockResolvedValue({ id: "prop-1", name: "Old Bill Cook", entity: "BNP" });
    mockStorage.getLeaseRooms.mockResolvedValue([
      { roomId: "r1", roomNameSnapshot: "Room 1", roomNumberSnapshot: "1" },
    ]);
    mockStorage.getScheduleByLease.mockResolvedValue([
      { scheduleSeq: 1, amount: "250", status: "PAID", paymentMethod: "CARD_ON_FILE", paidAt: new Date("2026-07-05") },
      { scheduleSeq: 2, amount: "250", status: "PAID", paymentMethod: "MANUAL", paidAt: new Date("2026-07-12") },
      { scheduleSeq: 3, amount: "250", status: "DUE", paymentMethod: "CARD_ON_FILE", paidAt: null }, // unpaid → excluded
    ]);
    mockStorage.getLateFeesByLease.mockResolvedValue([
      { scheduleSeq: 2, amount: "25", status: "BILLED", accrualDate: "2026-07-13" },
      { scheduleSeq: 2, amount: "25", status: "ACCRUED", accrualDate: "2026-07-14" }, // not collected → excluded
    ]);

    const rep = await buildReconciliationReport("2026-07-01", "2026-07-31", GEN);

    expect(rep.grand.rentCard).toBe(250);
    expect(rep.grand.rentManual).toBe(250);
    expect(rep.grand.lateFees).toBe(25);
    expect(rep.grand.total).toBe(525);

    const e = rep.entities.find((x) => x.entity === "BNP")!;
    expect(e.total).toBe(525);
    const p = e.properties[0];
    expect(p.propertyName).toBe("Old Bill Cook");
    const room = p.rooms[0];
    expect(room.rentCard).toBe(250);
    expect(room.rentManual).toBe(250);
    expect(room.lateFees).toBe(25);
    expect(room.total).toBe(525);
  });

  it("excludes payments outside the date range", async () => {
    mockStorage.getLeases.mockResolvedValue([{ id: "lease-1", propertyId: "prop-1" }]);
    mockStorage.getProperty.mockResolvedValue({ id: "prop-1", name: "OBC", entity: "BNP" });
    mockStorage.getLeaseRooms.mockResolvedValue([{ roomId: "r1", roomNameSnapshot: "Room 1", roomNumberSnapshot: "1" }]);
    mockStorage.getScheduleByLease.mockResolvedValue([
      { scheduleSeq: 1, amount: "250", status: "PAID", paymentMethod: "CARD_ON_FILE", paidAt: new Date("2026-06-30") }, // before
      { scheduleSeq: 2, amount: "250", status: "PAID", paymentMethod: "CARD_ON_FILE", paidAt: new Date("2026-07-15") }, // in
      { scheduleSeq: 3, amount: "250", status: "PAID", paymentMethod: "CARD_ON_FILE", paidAt: new Date("2026-08-01") }, // after
    ]);
    mockStorage.getLateFeesByLease.mockResolvedValue([]);

    const rep = await buildReconciliationReport("2026-07-01", "2026-07-31", GEN);
    expect(rep.grand.rentCard).toBe(250); // only the July 15 payment
  });

  it("separates two entities (e.g. TRAD vs BNP)", async () => {
    mockStorage.getLeases.mockResolvedValue([
      { id: "l1", propertyId: "p-bnp" },
      { id: "l2", propertyId: "p-trad" },
    ]);
    mockStorage.getProperty.mockImplementation(async (id: string) =>
      id === "p-bnp"
        ? { id: "p-bnp", name: "OBC", entity: "BNP" }
        : { id: "p-trad", name: "TRAD House", entity: "TRAD" },
    );
    mockStorage.getLeaseRooms.mockResolvedValue([{ roomId: "r", roomNameSnapshot: "Room", roomNumberSnapshot: "1" }]);
    mockStorage.getScheduleByLease.mockResolvedValue([
      { scheduleSeq: 1, amount: "100", status: "PAID", paymentMethod: "CARD_ON_FILE", paidAt: new Date("2026-07-10") },
    ]);
    mockStorage.getLateFeesByLease.mockResolvedValue([]);

    const rep = await buildReconciliationReport("2026-07-01", "2026-07-31", GEN);
    expect(rep.entities.map((e) => e.entity).sort()).toEqual(["BNP", "TRAD"]);
    expect(rep.grand.total).toBe(200);
  });
});
