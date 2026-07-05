// client/src/content/testimonials.ts
// -----------------------------------------------------------------------------
// Resident quotes — social proof shown on the home page, /community, /about, and
// (filtered to the property's city) on the detail pages. Placeholder copy — swap
// for real quotes as you collect them. `city` must match the city string the
// site derives via cityOf() (e.g. "Atlanta", "St. John's") so per-property
// filtering works. `area` is the human neighborhood/home label shown in the card.
// -----------------------------------------------------------------------------

export interface Testimonial {
  id: string;
  name: string;
  area: string;
  city: string;
  quote: string;
  rating?: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t-ava",
    name: "Ava M.",
    area: "Old Bill Cook · Atlanta",
    city: "Atlanta",
    quote:
      "Booking direct was so much easier than the apps. The room was exactly what the photos showed, and everything really was included — I didn't get a single surprise bill.",
    rating: 5,
  },
  {
    id: "t-marcus",
    name: "Marcus T.",
    area: "Old Bill Cook · Atlanta",
    city: "Atlanta",
    quote:
      "I travel for work and needed a furnished room for a few months. Moved in the same day, and having a real person to text when I had a question made all the difference.",
    rating: 5,
  },
  {
    id: "t-priya",
    name: "Priya R.",
    area: "Hutchens · Atlanta",
    city: "Atlanta",
    quote:
      "The house is clean, the Wi-Fi is fast, and the other people living here are great. It feels like a home, not a rental.",
    rating: 5,
  },
  {
    id: "t-devon",
    name: "Devon K.",
    area: "Hutchens · Atlanta",
    city: "Atlanta",
    quote:
      "Weekly cleaning kept the common areas spotless the whole time I stayed. Worth it just for that peace of mind.",
    rating: 5,
  },
  {
    id: "t-carla",
    name: "Carla & James",
    area: "Whole-home getaway · St. John's",
    city: "St. John's",
    quote:
      "We had the whole place to ourselves for a week. Gorgeous, private, and the host checked in without ever being intrusive. We'll be back.",
    rating: 5,
  },
  {
    id: "t-nate",
    name: "Nate S.",
    area: "Whole-home getaway · Atlanta",
    city: "Atlanta",
    quote:
      "Perfect weekend spot for our family. Easy check-in, spotless, and the price beat what we'd have paid on the big platforms.",
    rating: 5,
  },
];
