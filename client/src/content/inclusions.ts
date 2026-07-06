// client/src/content/inclusions.ts
// -----------------------------------------------------------------------------
// "Everything's included" — the flat list of what a stay covers, shown on the
// home page, the /community and /about pages, and (compact) on the detail pages.
// Placeholder marketing copy — edit freely. Nothing here is computed. Swap for
// your real inclusion list per property type as it firms up.
//
// `icon` is a Lucide component reference (same pattern as home.tsx TRUST_ITEMS).
// -----------------------------------------------------------------------------
import {
  Wifi,
  Sparkles,
  UtensilsCrossed,
  WashingMachine,
  Zap,
  BedDouble,
  ShieldCheck,
  Headset,
  type LucideIcon,
} from "lucide-react";

export interface Inclusion {
  icon: LucideIcon;
  label: string;
  note: string;
  /** Warm photo that represents this inclusion. Revealed on card hover in the
   *  "full" InclusionsGrid variant. Path under client/public. */
  image: string;
}

export const INCLUSIONS: Inclusion[] = [
  { icon: Zap, label: "Utilities included", note: "Power, water, and gas in one flat price. No surprise bills.", image: "/inclusions/utilities.jpg" },
  { icon: Wifi, label: "Fast Wi-Fi", note: "Work-from-home ready in every room and common space.", image: "/inclusions/wifi.jpg" },
  { icon: Sparkles, label: "Weekly cleaning", note: "Shared spaces cleaned every week, kept move-in fresh.", image: "/inclusions/cleaning.jpg" },
  { icon: UtensilsCrossed, label: "Furnished kitchen", note: "Cook right away — cookware, dishes, and appliances stocked.", image: "/inclusions/kitchen.jpg" },
  { icon: WashingMachine, label: "On-site laundry", note: "Washer and dryer in the home. No laundromat runs.", image: "/inclusions/laundry.jpg" },
  { icon: BedDouble, label: "Fully furnished", note: "Beds, linens, and living areas set up before you arrive.", image: "/inclusions/furnished.jpg" },
  { icon: ShieldCheck, label: "Verified & insured", note: "Every home is one we own or manage ourselves.", image: "/inclusions/verified.jpg" },
  { icon: Headset, label: "A real host", note: "A direct line to the person who runs the property, not a call center.", image: "/inclusions/host.jpg" },
];
