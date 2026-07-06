// client/src/content/hosts.ts
// -----------------------------------------------------------------------------
// The people who run the homes — shown on /community. Placeholder copy; swap for
// your real hosts. `photo` is optional: leave it undefined and the avatar falls
// back to a deterministic branded gradient (via <ListingImage> keyed on `id`),
// so a missing headshot never breaks the layout. `city` mirrors the cityOf()
// value if you later want to filter hosts by location.
// -----------------------------------------------------------------------------

export interface Host {
  id: string;
  name: string;
  area: string;
  city: string;
  blurb: string;
  photo?: string;
  role?: string;
}

export const HOSTS: Host[] = [
  {
    id: "host-alex",
    name: "Alex",
    area: "Atlanta homes",
    city: "Atlanta",
    role: "Founder & host",
    blurb:
      "Runs the Atlanta co-living homes day to day. If something needs fixing or you just have a question about the neighborhood, Alex is the person you'll be texting.",
  },
  {
    id: "host-della",
    name: "Della",
    area: "Guest experience",
    city: "Atlanta",
    role: "Co-founder",
    blurb:
      "Makes sure every home feels welcoming from the moment you walk in: the linens, the little touches, and the move-in details that make a house feel like yours.",
  },
];
