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
      "Booking direct was so much easier than the apps. The room matched the photos exactly, and everything really was included. Not one surprise bill the whole time.",
    rating: 5,
  },
  {
    id: "t-marcus",
    name: "Marcus T.",
    area: "Old Bill Cook · Atlanta",
    city: "Atlanta",
    quote:
      "I travel for work and needed a furnished room for a few months. I moved in the same day I asked, and being able to text a real person when I had a question made all the difference.",
    rating: 5,
  },
  {
    id: "t-priya",
    name: "Priya R.",
    area: "Hutchens · Atlanta",
    city: "Atlanta",
    quote:
      "The house is clean, the Wi-Fi is genuinely fast, and my housemates turned out to be great. It feels like a home, not a rental.",
    rating: 5,
  },
  {
    id: "t-devon",
    name: "Devon K.",
    area: "Hutchens · Atlanta",
    city: "Atlanta",
    quote:
      "Weekly cleaning kept the common areas spotless the entire time I lived there. Honestly worth it just for that peace of mind.",
    rating: 5,
  },
  {
    id: "t-carla",
    name: "Carla & James",
    area: "Whole-home getaway · St. John's",
    city: "St. John's",
    quote:
      "We had the whole place to ourselves for a week. Gorgeous, private, and the host checked in without ever being intrusive. We'll definitely be back.",
    rating: 5,
  },
  {
    id: "t-nate",
    name: "Nate S.",
    area: "Whole-home getaway · Atlanta",
    city: "Atlanta",
    quote:
      "Perfect weekend spot for our family. Check-in was easy, the place was spotless, and the price beat what we'd have paid on the big platforms.",
    rating: 5,
  },
  {
    id: "t-tasha",
    name: "Tasha B.",
    area: "Old Bill Cook · Atlanta",
    city: "Atlanta",
    quote:
      "I was nervous about co-living, but this changed my mind. Everyone here respects the shared space, and I've made a couple of real friends out of it.",
    rating: 5,
  },
  {
    id: "t-jordan",
    name: "Jordan P.",
    area: "Hutchens · Atlanta",
    city: "Atlanta",
    quote:
      "I moved to Atlanta for a new job and didn't know a soul. Having a furnished room ready to go took a huge weight off. All I had to bring was a suitcase.",
    rating: 5,
  },
  {
    id: "t-elise",
    name: "Elise W.",
    area: "Old Bill Cook · Atlanta",
    city: "Atlanta",
    quote:
      "What sold me was the price being exactly what they said up front. No deposit games, no cleaning fee tacked on at the end. Just a fair weekly rate.",
    rating: 5,
  },
  {
    id: "t-andre",
    name: "Andre F.",
    area: "Hutchens · Atlanta",
    city: "Atlanta",
    quote:
      "My last place had a management company that never picked up. Here I texted about a leaky faucet on a Sunday and someone came Monday morning. Big difference.",
    rating: 5,
  },
];
