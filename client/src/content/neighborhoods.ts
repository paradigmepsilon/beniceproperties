// client/src/content/neighborhoods.ts
// -----------------------------------------------------------------------------
// Neighborhood storytelling, keyed by city. Surfaced on the property/room detail
// pages below the listing story, matched via cityOf(property.location). A city
// with no entry here simply renders nothing (the block guards itself). `prose`
// is plain text (rendered through <RichText>, blank lines = paragraphs).
// Placeholder copy — swap for real neighborhood write-ups. `mapsUrl` is optional.
// -----------------------------------------------------------------------------

export interface Neighborhood {
  city: string;
  headline: string;
  prose: string;
  knownFor: string[];
  mapsUrl?: string;
}

export const NEIGHBORHOODS: Neighborhood[] = [
  {
    city: "Atlanta",
    headline: "Room to breathe, minutes from the city",
    prose:
      "Our Atlanta homes sit in quiet, established neighborhoods on the southwest side — the kind of streets with driveways and backyards, not high-rise noise.\n\nYou're a short drive from Hartsfield-Jackson, downtown, and the job centers, but you come home to space and calm. Grocery stores, gyms, and everyday errands are all close by.",
    knownFor: ["Close to the airport", "Quiet residential streets", "Backyard space", "Easy downtown access", "Everyday errands nearby"],
    mapsUrl: "https://www.google.com/maps/search/Atlanta+GA",
  },
  {
    city: "St. John's",
    headline: "An island escape that's genuinely yours",
    prose:
      "Antigua's capital pairs turquoise water with real local life — markets, restaurants, and beaches that aren't just for tourists.\n\nOur whole-home getaways give you a private base to explore from: quiet mornings on your own terrace, beaches a short drive away, and a host who knows where the locals actually go.",
    knownFor: ["Walkable to town", "Beaches nearby", "Private terrace", "Local markets & dining", "On-island host"],
    mapsUrl: "https://www.google.com/maps/search/St+John%27s+Antigua",
  },
];
