// client/src/content/house-rules.ts
// =============================================================================
// FACTUAL DISCIPLINE — read before editing.
//
// This page is referenced BY NAME in the Room Booking & Resident Acknowledgment
// a guest signs ("the house rules published at …, which form part of this
// acknowledgment"). It is therefore quasi-legal text, not marketing copy.
//
// DO NOT INVENT A RULE HERE. Every policy below was supplied by the owner
// ("10 Coliving House Rules", Alex Henry, 2026-09-09) and is reproduced with
// only typographic edits. Sections with no owner copy stay EMPTY and render
// nothing rather than a placeholder. Change a policy only on the owner's word,
// and bump HOUSE_RULES_UPDATED when you do — the date is printed on the page so
// a guest can tell which version they agreed to.
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
export const HOUSE_RULES_UPDATED = "2026-09-09";

/**
 * Sections are generic — no property is named, so adding a property needs no
 * change here. An empty `rules` array is simply not rendered.
 */
export const HOUSE_RULES: HouseRuleSection[] = [
  {
    id: "check-in-out",
    heading: "Check-in and checkout",
    rules: [
      { title: "Check-in time", body: "Check-in is at 4:00 PM Eastern." },
      { title: "Checkout time", body: "Checkout is at 11:00 AM Eastern." },
    ],
  },
  {
    id: "shared-spaces",
    heading: "Your room and the shared spaces",
    rules: [
      {
        title: "You are renting a private room, not the entire house",
        body:
          "Please avoid making excessive noise or disturbing the other house guests. Your room " +
          "is yours; the rest of the house is shared with everyone staying here.",
      },
      {
        title: "Common areas",
        body:
          "Common areas include the laundry room, lounge, dining room and kitchen area. The " +
          "marketplace wall items are available for purchase — visit our website for more items.",
      },
      {
        title: "Keep your belongings in your room",
        body:
          "Keep all personal belongings in your private room at all times. Each guest is provided " +
          "a bathroom caddy to carry items in and out. Management is not responsible for lost or " +
          "discarded items.",
      },
    ],
  },
  {
    id: "keys-and-security",
    heading: "Doors, codes and security",
    rules: [
      {
        title: "Keep the front door locked at all times",
        body: "Close and lock the front door behind you, every time, coming or going.",
      },
      {
        title: "Lock your room when you leave",
        body: "Please ensure your door is locked whenever you leave your room.",
      },
      {
        title: "Your door code is personal",
        body:
          "The code we send you is for you alone. Please don't share, copy, or pass it on — not " +
          "to a friend, and not to another resident.",
      },
    ],
  },
  {
    id: "quiet-hours",
    heading: "Quiet hours",
    rules: [
      {
        title: "Quiet hours are 10:00 PM to 7:00 AM",
        body:
          "Musical instruments, radios, televisions, stereos and any other source of amplified " +
          "sound shall be played at a volume that does not disturb or annoy other guests. Pay " +
          "particular attention to limiting noise between the quiet hours of 10:00 PM and 7:00 AM.",
      },
    ],
  },
  {
    id: "visitors",
    heading: "Guests and visitors",
    rules: [
      {
        title: "No parties or social gatherings",
        body: "No parties or social event gatherings of any kind are permitted on the property.",
      },
    ],
  },
  {
    id: "cleaning",
    heading: "Kitchen, cleaning and trash",
    rules: [
      {
        title: "Clean up immediately after yourself",
        body:
          "The kitchen includes a refrigerator, microwave, and dishes, glasses and utensils for " +
          "meal preparation. Please clean up immediately after yourself.",
      },
      {
        title: "Label your food and keep it in your designated area",
        body:
          "Please place food in the room-designated areas within the kitchen. Anything not in a " +
          "properly labeled area and in non-consumable condition will be disposed of, excluding " +
          "condiments that are still in consumable condition.",
      },
      {
        title: "Nothing but toilet paper down the toilet",
        body:
          "No cigarette butts, cotton buds, tampons, sanitary pads or any other material other " +
          "than toilet paper may be flushed down the toilet. Charges will occur for any blockage.",
      },
    ],
  },
  {
    id: "smoking",
    heading: "Smoking",
    rules: [
      {
        title: "Absolutely no smoking inside the house",
        body: "No smoking of any kind is allowed inside the house.",
      },
    ],
  },
  {
    id: "pets",
    heading: "Pets",
    rules: [{ title: "Pets are not allowed", body: "Pets are not allowed at this property." }],
  },
  {
    id: "checkout",
    heading: "Leaving",
    rules: [
      {
        title: "On your last day",
        body:
          "Take everything with you, leave the room tidy, and check out by 11:00 AM. Your access " +
          "code automatically becomes inactive after your reservation ends. If you'd like more " +
          "time, you can extend from your stay page before checkout.",
      },
    ],
  },
  {
    id: "why",
    heading: "Why we have house rules",
    rules: [
      {
        title: "For everyone's comfort, privacy and security",
        body:
          "House rules are established for the comfort, privacy and security of all guests. Your " +
          "cooperation is very much appreciated! You may book with us again at " +
          "www.beniceproperties.com or send us an email at beniceproperties@gmail.com.",
      },
    ],
  },
  // --- Sections with no owner copy yet. Each renders nothing until `rules` is
  // populated; nothing is invented here. ---
  { id: "parking", heading: "Parking", rules: [] },
  { id: "ending-early", heading: "What ends a stay early", rules: [] },
];

/** Only the sections that actually have content. */
export const populatedHouseRules = (): HouseRuleSection[] =>
  HOUSE_RULES.filter((s) => s.rules.length > 0);
