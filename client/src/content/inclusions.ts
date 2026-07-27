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
  /** Alt text for `image`. Describes what is in the photo, not the label — the
   *  label and note are already adjacent text. These are real photos of real
   *  homes, so they earn a place in image search rather than being marked
   *  decorative. Required, so a new inclusion can't ship without one. */
  imageAlt: string;
}

export const INCLUSIONS: Inclusion[] = [
  { icon: Zap, label: "Utilities included", note: "Power, water, and gas in one flat price. No surprise bills.", image: "/inclusions/utilities.jpg", imageAlt: "Warmly lit co-living living room at dusk with lamps and overhead lighting on" },
  { icon: Wifi, label: "Fast Wi-Fi", note: "Work-from-home ready in every room and common space.", image: "/inclusions/wifi.jpg", imageAlt: "Laptop open on a desk by a sunlit window in a furnished private room" },
  { icon: Sparkles, label: "Weekly cleaning", note: "Shared spaces cleaned every week, kept move-in fresh.", image: "/inclusions/cleaning.jpg", imageAlt: "Freshly cleaned shared living area with clear surfaces and neatly arranged cushions" },
  { icon: UtensilsCrossed, label: "Furnished kitchen", note: "Cook right away. Cookware, dishes, and appliances are all stocked.", image: "/inclusions/kitchen.jpg", imageAlt: "Stocked co-living kitchen with cookware, dishes, and full-size appliances" },
  { icon: WashingMachine, label: "On-site laundry", note: "Washer and dryer in the home. No laundromat runs.", image: "/inclusions/laundry.jpg", imageAlt: "In-home washer and dryer with folded towels stacked alongside" },
  { icon: BedDouble, label: "Fully furnished", note: "Beds, linens, and living areas set up before you arrive.", image: "/inclusions/furnished.jpg", imageAlt: "Made-up bed with fresh linens in a furnished private room with a nightstand and lamp" },
  { icon: ShieldCheck, label: "Verified & insured", note: "Every home is one we own or manage ourselves.", image: "/inclusions/verified.jpg", imageAlt: "Front door and porch of a well-kept Be Nice co-living home" },
  { icon: Headset, label: "A real host", note: "A direct line to the person who runs the property, not a call center.", image: "/inclusions/host.jpg", imageAlt: "Host answering a guest message on a phone at a kitchen counter" },
];
