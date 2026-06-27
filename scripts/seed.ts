// scripts/seed.ts
// =============================================================================
// PLACEHOLDER inventory seed. Run with `npm run seed`.
//
// EVERY listing here is a clearly-labeled PLACEHOLDER ("[PLACEHOLDER]"). Do NOT
// treat these as real inventory — Alex replaces them with real properties.
// The script is IDEMPOTENT: it keys off property name and skips existing rows,
// so running it twice does not duplicate anything.
//
// Requires DATABASE_URL pointed at a Neon branch with the schema pushed
// (`npm run db:push`). Does nothing destructive.
// =============================================================================

import "dotenv/config";
import { storage } from "../server/storage";

type SeedRoom = { name: string; roomNumber?: string; weeklyRent: string; depositAmount: string };
type SeedProperty = {
  name: string;
  location: string;
  type: "STR" | "COLIVING";
  description: string;
  basePrice?: string;
  cleaningFee?: string;
  rooms?: SeedRoom[];
};

const PLACEHOLDER_INVENTORY: SeedProperty[] = [
  {
    name: "[PLACEHOLDER] Antigua Beach Villa",
    location: "Antigua",
    type: "STR",
    description: "[PLACEHOLDER] Whole-home oceanfront villa. Replace with real listing.",
    basePrice: "450.00",
    cleaningFee: "150.00",
  },
  {
    name: "[PLACEHOLDER] Hutchens Co-Living House",
    location: "Atlanta",
    type: "COLIVING",
    description: "[PLACEHOLDER] Rent-by-the-room co-living house. Replace with real listing.",
    rooms: [
      { name: "[PLACEHOLDER] Room A", roomNumber: "A", weeklyRent: "275.00", depositAmount: "275.00" },
      { name: "[PLACEHOLDER] Room B", roomNumber: "B", weeklyRent: "250.00", depositAmount: "250.00" },
    ],
  },
  {
    name: "[PLACEHOLDER] Old Bill Cook Co-Living House",
    location: "Atlanta",
    type: "COLIVING",
    description: "[PLACEHOLDER] Rent-by-the-room co-living house. Replace with real listing.",
    rooms: [{ name: "[PLACEHOLDER] Room 1", roomNumber: "1", weeklyRent: "260.00", depositAmount: "260.00" }],
  },
];

async function seed() {
  const existing = await storage.getProperties();
  const existingNames = new Set(existing.map((p) => p.name));

  for (const item of PLACEHOLDER_INVENTORY) {
    if (existingNames.has(item.name)) {
      console.log(`skip (exists): ${item.name}`);
      continue;
    }
    const property = await storage.createProperty({
      name: item.name,
      location: item.location,
      type: item.type,
      description: item.description,
      basePrice: item.basePrice ?? null,
      cleaningFee: item.cleaningFee ?? "0",
      active: true,
    });
    console.log(`created property: ${property.name}`);

    for (const room of item.rooms ?? []) {
      await storage.createRoom({
        propertyId: property.id,
        name: room.name,
        roomNumber: room.roomNumber ?? null,
        weeklyRent: room.weeklyRent,
        depositAmount: room.depositAmount,
        status: "AVAILABLE",
      });
      console.log(`  created room: ${room.name}`);
    }
  }

  console.log("seed complete (PLACEHOLDER inventory).");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed failed:", err);
    process.exit(1);
  });
