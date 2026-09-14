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
      "Our Atlanta homes sit in quiet, established neighborhoods on the southwest side. Think streets with driveways and backyards, not high-rise noise.\n\nYou're a short drive from Hartsfield-Jackson, downtown, and the job centers, but you come home to space and calm. Grocery stores, gyms, and everyday errands are all close by.",
    knownFor: ["Close to the airport", "Quiet residential streets", "Backyard space", "Easy downtown access", "Everyday errands nearby"],
    mapsUrl: "https://www.google.com/maps/search/Atlanta+GA",
  },
  {
    city: "St. John's",
    headline: "An island escape that's genuinely yours",
    prose:
      "Antigua's capital pairs turquoise water with real local life: markets, restaurants, and beaches that aren't just for tourists.\n\nOur whole-home getaways give you a private base to explore from: quiet mornings on your own terrace, beaches a short drive away, and a host who knows where the locals actually go.",
    knownFor: ["Walkable to town", "Beaches nearby", "Private terrace", "Local markets & dining", "On-island host"],
    mapsUrl: "https://www.google.com/maps/search/St+John%27s+Antigua",
  },
  {
    city: "Charlotte",
    headline: "Established neighborhoods, a short hop from Uptown",
    prose:
      "Our Charlotte homes sit in the city's older, tree-lined neighborhoods: bungalows and brick ranches on streets with porches and driveways, not new-build apartment blocks.\n\nUptown, the hospitals, and SouthPark are all a short drive or a light-rail ride away, and Charlotte Douglas is under half an hour from any of them. You get the city on your schedule and a quiet house to come home to.",
    knownFor: ["Walkable neighborhoods", "Close to the hospitals", "Light rail & bus access", "Porches and backyards", "CLT under 30 min"],
    mapsUrl: "https://www.google.com/maps/search/Charlotte+NC",
  },
  {
    city: "Charleston",
    headline: "Lowcountry living, on the peninsula or just off it",
    prose:
      "Our Charleston homes range from a renovated downtown cottage a short walk from King Street to a quiet cul-de-sac house in West Ashley, twenty minutes out.\n\nMUSC, the hospitality corridor, and the airport-and-Boeing side of town are all reachable, and the West Ashley Greenway is close by for a run after a shift. Either way you get a furnished room in a real house, not a hotel.",
    knownFor: ["Downtown on foot", "Close to MUSC", "Off-street parking", "Greenway nearby", "CHS & Boeing 20 min"],
    mapsUrl: "https://www.google.com/maps/search/Charleston+SC",
  },
  {
    city: "Jacksonville",
    headline: "Quiet Mandarin streets with room to park",
    prose:
      "Our Jacksonville home sits in the Mandarin area on the city's south side: a single-story brick house on a quiet street with a fenced backyard and a driveway with space for everyone.\n\nBaptist South, St. Johns Town Center, and I-295 are minutes away, and downtown is a twenty-minute drive. Everyday errands are all close by.",
    knownFor: ["Quiet residential streets", "Parking for every room", "Close to Baptist South", "Fenced backyard", "Quick I-295 access"],
    mapsUrl: "https://www.google.com/maps/search/Mandarin+Jacksonville+FL",
  },
];
