// client/src/content/house-rules.ts
// =============================================================================
// FACTUAL DISCIPLINE — read before editing.
//
// This page is referenced BY NAME in the short-stay rental agreement a guest
// signs ("the house rules published at …, which form part of this Agreement").
// It is therefore quasi-legal text, not marketing copy.
//
// DO NOT INVENT A RULE HERE. Quiet hours, pet policy, smoking policy, guest and
// visitor limits, and anything about ending a stay early are OWNER decisions with
// legal weight. Every section below self-guards on being non-empty, so the page
// ships correctly with only the sections the owner has actually supplied — an
// empty section renders nothing rather than a placeholder.
// =============================================================================

export interface HouseRule {
  title: string;
  body: string;
}

export interface HouseRuleSection {
  id: string;
  heading: string;
  rules: HouseRule[];
}

/** Rendered on the page and referenced by the agreement, so guests can tell versions apart. */
export const HOUSE_RULES_UPDATED = "2026-09-08";

/**
 * Sections are generic — no property is named, so adding a property needs no
 * change here. Populate `rules` as the owner supplies the text; an empty section
 * is simply not rendered.
 */
export const HOUSE_RULES: HouseRuleSection[] = [
  {
    id: "shared-spaces",
    heading: "Shared spaces",
    rules: [
      {
        title: "Treat shared rooms as shared",
        body:
          "Kitchens, bathrooms and living areas are used by everyone in the house. Clean up after " +
          "yourself, wash what you use, and leave a space as you would want to find it.",
      },
      {
        title: "Your room is yours",
        body:
          "Only the guest named on the booking may occupy the room. Please don't enter another " +
          "resident's room or move their belongings.",
      },
    ],
  },
  {
    id: "keys-and-security",
    heading: "Keys, door codes and security",
    rules: [
      {
        title: "Your door code is personal",
        body:
          "The code we send you is for you alone. Please don't share, copy, or pass it on — not " +
          "to a friend, and not to another resident. Close and lock the door behind you.",
      },
    ],
  },
  {
    id: "checkout",
    heading: "Leaving",
    rules: [
      {
        title: "On your last day",
        body:
          "Take everything with you, strip nothing, leave the room tidy, and stop using your door " +
          "code. If you'd like more time, you can extend from your stay page before checkout.",
      },
    ],
  },
  // --- Sections awaiting owner copy. Each renders nothing until `rules` is
  // populated; none of these policies is invented here. ---
  { id: "quiet-hours", heading: "Quiet hours", rules: [] },
  { id: "visitors", heading: "Guests and visitors", rules: [] },
  { id: "cleaning", heading: "Cleaning and trash", rules: [] },
  { id: "smoking", heading: "Smoking and substances", rules: [] },
  { id: "parking", heading: "Parking", rules: [] },
  { id: "pets", heading: "Pets", rules: [] },
  { id: "ending-early", heading: "What ends a stay early", rules: [] },
];

/** Only the sections that actually have content. */
export const populatedHouseRules = (): HouseRuleSection[] =>
  HOUSE_RULES.filter((s) => s.rules.length > 0);
