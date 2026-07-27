// client/src/content/founders.ts
// The owner-operators, named and shown.
//
// Why this exists: the site's strongest and most-repeated claim is "a direct
// line to the person who runs the property, not a call center." That claim was
// made only as an icon chip — no name, no face, no response commitment — while
// the page it most needed to appear on (/about) opened on a flat color block.
// Someone choosing where they will live for three months is deciding whether to
// trust a stranger; a named, photographed owner is the single highest-value
// trust asset this business has, and it costs nothing to ship.
//
// PHOTOS ARE NOT YET IN THE REPO. Drop them at the paths below and they render
// automatically; until then FounderCard falls back to an initials monogram
// rather than a broken image. Portrait, roughly 3:4, min 800x1067, warm natural
// light to match /editorial. Real photos only — the entire point of this section
// is that these two people are real.

export interface Founder {
  name: string;
  role: string;
  /** Path under client/public. Renders a monogram fallback until the file exists. */
  photo: string;
  /** Alt text. Written here so it is never left to a caller to forget. */
  photoAlt: string;
  /** Two or three sentences, first person plural. No awards, no résumé. */
  bio: string;
}

export const FOUNDERS: Founder[] = [
  {
    name: "Alex Henry",
    role: "Co-founder",
    photo: "/founders/alex-henry.jpg",
    photoAlt: "Alex Henry, co-founder of Be Nice Properties",
    bio: "I handle the systems side: the bookings, the pricing, the software that keeps our homes running. If you message us about a room, there is a good chance I am the one who answers.",
  },
  {
    name: "Della Henry",
    role: "Co-founder",
    photo: "/founders/della-henry.jpg",
    photoAlt: "Della Henry, co-founder of Be Nice Properties",
    bio: "I look after the homes themselves and the people in them. Making sure a house is genuinely ready before someone moves in, and that it stays that way while they are here.",
  },
];

// Shown under the founder cards. Keep this honest — it is a promise, and an
// unmet one does more damage than no promise at all.
export const FOUNDER_PROMISE =
  "We own or manage every home on this site. When you send a message, it reaches one of us, not a call center.";
