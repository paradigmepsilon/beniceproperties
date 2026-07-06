// client/src/content/company.ts
// -----------------------------------------------------------------------------
// The BNP brand/story block + social links — reused on /about, /community, and
// the footer "Follow us" strip. Placeholder copy; swap for your real story and
// real social handles. `foundingStory` is plain text (rendered via <RichText>).
// Leave a social link undefined to hide it. NOTE: these are plain links, not a
// live third-party embed — no external script is loaded.
// -----------------------------------------------------------------------------

export interface CompanySocial {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
}

export interface Company {
  missionHeadline: string;
  missionBody: string;
  foundingStory: string;
  social: CompanySocial;
}

export const COMPANY: Company = {
  missionHeadline: "Comfortable places to stay, run by people who care",
  missionBody:
    "Be Nice Properties is exactly what it sounds like. We own and manage every home ourselves, from whole-home getaways to by-the-room co-living, and we run them the way we'd want a place we stayed in to be run: clean, honest, and genuinely welcoming.",
  foundingStory:
    "We started Be Nice Properties because renting somewhere to stay had gotten impersonal. Faceless listings, surprise fees, and a call center instead of a person.\n\nWe wanted the opposite: homes we're proud of, prices you can see up front, and a real host you can reach. Whether you're booking a weekend away or renting a room for a season, you're dealing directly with the people who actually run the place.\n\nWe're growing from Atlanta to Antigua and beyond, one well-run home at a time.",
  social: {
    instagram: "https://www.instagram.com/beniceproperties/",
    facebook: "https://www.facebook.com/benicepropertiesinc",
    tiktok: "https://www.tiktok.com/@beniceproperties",
  },
};
