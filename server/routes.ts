// server/routes.ts
// =============================================================================
// Full REST surface for BNP.
//   Public:  inventory browse/detail, quote, create booking, guest lookup
//   Stripe:  webhook (source of truth for payment state)
//   Admin:   dashboard aggregates, bookings, reconciliation (mark-paid),
//            inventory CRUD, payments/subscriptions view, KPI push-now
// All DB access goes through `storage`. Money is always computed server-side via
// the canonical breakdown (see server/lib/booking.ts).
// =============================================================================

import express, { type Express } from "express";
import multer from "multer";
import { z } from "zod";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { setupAuth, requireAdmin } from "./auth";
import { storage } from "./storage";
import {
  quoteRequestSchema,
  createBookingSchema,
  bookingIntentSchema,
  leaseQuoteRequestSchema,
  type CreateBookingResponse,
} from "@shared/api-types";
import {
  insertPropertySchema,
  insertRoomSchema,
  insertNewsletterSubscriberSchema,
  insertLtrInquirySchema,
  insertPartnerInquirySchema,
  insertManualBlockSchema,
  US_STATE_CODES,
  COLIVING_MIN_DAYS,
  LEASE_STATUSES,
  type PropertyListItem,
  type RoomWithAvailability,
  type JournalBlock,
} from "@shared/schema";
import {
  resolveBooking,
  buildQuote,
  generateReference,
  strHasConflict,
  BookingError,
} from "./lib/booking";
import { buildLeaseQuote, LeaseError } from "./lib/lease";
import { buildStrAvailability, buildRoomAvailability, isRoomBookableStatus, roomAvailableForDates } from "./lib/availability";
import { todayIso } from "@shared/dates";
import { dayAfter, strNextOpening, cheapestAvailableWeeklyRent } from "./lib/nextOpening";
import {
  buildStrChargeMetadata,
  buildLeaseChargeMetadata,
  buildRoomBookingChargeMetadata,
  buildShortStayIntentMetadata,
} from "./lib/paymentMetadata";
import { createDraftLease, previewLease, signLease } from "./lib/leaseFlow";
import {
  startFirstPayment,
  finalizeFirstPayment,
  startDepositPayment,
  finalizeDepositPayment,
  refundDeposit,
} from "./lib/leasePayments";
import { billAccruedLateFees, handleChargeFailure } from "./lib/dunning";
import { materializeShortStayBooking } from "./lib/materialize";
import { cancelBooking, confirmConflictBooking } from "./lib/bookingConflicts";
import { onBookingConfirmed } from "./lib/lifecycle";
import { notifyAdmin } from "./lib/notifications";
import {
  getPortalView,
  payInstallmentNow,
  electManualInstallment,
  submitMessage,
  replyToThread,
  getThread,
} from "./lib/portal";
import { buildManualInstructions } from "./lib/manualPayment";
import {
  uploadLicense,
  saveVehicle,
  uploadVehiclePhoto,
  getLicenseViewUrl,
  approveVerification,
  rejectVerification,
  type UploadedFile,
} from "./lib/verification";
import { requireServiceToken } from "./lib/serviceAuth";
import * as uo from "./lib/uoApi";
import * as adminMessages from "./lib/adminMessages";
import { refreshExternalCalendars } from "./lib/icalSync";
import { buildReconciliationReport } from "./lib/reconciliation";
import {
  createDraftLeaseSchema,
  signLeaseSchema,
} from "@shared/api-types";
import { stripePublishableConfigured } from "./lib/stripe";
import {
  isStripeConfigured,
  createCheckoutSession,
  createOneTimePaymentIntent,
  updatePaymentIntentContact,
  createWeeklySubscriptionCheckout,
  constructWebhookEvent,
} from "./lib/stripe";
import { buildAndPushSnapshot } from "./integrations/kpiRollup";
import { log } from "./server-log";
import { posthog } from "./lib/posthog";

function appUrl(req: express.Request, path: string): string {
  const proto = req.protocol;
  const host = req.get("host");
  return `${proto}://${host}${path}`;
}

// In-memory multipart parsing for the tenant upload routes (license / vehicle
// photo). Files are held in memory and handed straight to R2 — never written to
// disk. 12 MB cap mirrors the service-side limit; single field named "file".
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

/** Normalize a multer file into the verification service's UploadedFile. */
function toUploadedFile(f: Express.Multer.File | undefined): UploadedFile | undefined {
  if (!f) return undefined;
  return { buffer: f.buffer, mimetype: f.mimetype, size: f.size };
}

/**
 * Escape a string for XML text/attribute content. The sitemap route can skip
 * this because it only ever emits slugs and dates; /feed.xml emits author-written
 * titles and prose, where a single "&" or apostrophe produces a feed that every
 * reader rejects. Ampersand must be replaced first or it double-escapes the
 * entities introduced by the later replacements.
 *
 * Also strips control characters that are illegal in XML 1.0 at any escape level
 * (tab/LF/CR are the only ones permitted below 0x20).
 */
function xmlEscape(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Shared reconciliation handler (Phase 9). Module-level so both the UO and admin
// routes reference it regardless of registration order.
async function reconciliationHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): Promise<void> {
  try {
    const schema = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: "from and to (YYYY-MM-DD) required" });
      return;
    }
    const report = await buildReconciliationReport(parsed.data.from, parsed.data.to, new Date().toISOString());
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  // -------------------------------------------------------------------------
  // Stripe webhook MUST receive the raw body for signature verification, so it
  // is registered BEFORE express.json() (mounted in index.ts). We use a
  // route-specific raw parser here.
  // -------------------------------------------------------------------------
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      if (!sig || typeof sig !== "string") {
        return res.status(400).json({ message: "Missing stripe-signature" });
      }
      let event;
      try {
        event = constructWebhookEvent(req.body as Buffer, sig);
      } catch (err) {
        log(`webhook verify failed: ${(err as Error).message}`, "stripe");
        return res.status(400).json({ message: "Invalid signature" });
      }

      try {
        await handleStripeEvent(event);
      } catch (err) {
        log(`webhook handler error: ${(err as Error).message}`, "stripe");
        // Return 200 so Stripe doesn't hammer retries on our bugs; we logged it.
      }
      res.json({ received: true });
    },
  );

  // Session-based admin auth (adds /api/admin/login, /logout, /me).
  await setupAuth(app);

  // ---- Health ----
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "bnp",
      stripe: isStripeConfigured() ? "configured" : "test-placeholder",
      time: new Date().toISOString(),
    });
  });

  // Public site configuration — feature/visibility flags the client reads to
  // decide what to render. Managed from Unified-Ops (which writes the underlying
  // app_settings rows directly). Unset flags default to VISIBLE, so a fresh DB
  // behaves exactly as before this feature. A flag is stored as the string
  // "true"/"false"; anything other than "false" reads as visible. Mirrors the
  // public /api/payments/config shape.
  app.get("/api/site-config", async (_req, res, next) => {
    try {
      const [ltr, journal] = await Promise.all([
        storage.getSetting("page_ltr_visible"),
        storage.getSetting("page_journal_visible"),
      ]);
      res.json({
        pages: {
          ltr: ltr?.value !== "false",
          journal: journal?.value !== "false",
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // Newsletter signup (owned email-capture list). Public. Idempotent: a valid
  // email always returns 200, whether it's new or already subscribed — the
  // storage upsert never discloses prior membership. Invalid email → 400.
  app.post("/api/newsletter", async (req, res, next) => {
    try {
      const parsed = insertNewsletterSubscriberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid email" });
      }
      await storage.upsertNewsletterSubscriber(parsed.data);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // LTR (long-term-rental) inquiry capture. Public. Append-only lead: a valid
  // submission always returns 200 and writes a new row (no dedupe — a person may
  // inquire more than once). Invalid name/email → 400. LTR properties are
  // inquiry-only, so this is their sole conversion path (no booking/quote).
  app.post("/api/ltr-inquiries", async (req, res, next) => {
    try {
      const parsed = insertLtrInquirySchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: parsed.error.errors[0]?.message ?? "Invalid inquiry" });
      }
      await storage.createLtrInquiry(parsed.data);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Partner inquiry capture. Public, append-only B2B lead (a person may inquire
  // more than once). Valid → store → 200; invalid name/email → 400. Feeds the
  // /partner page's contact form (invest / manage / design / events / community).
  app.post("/api/partner-inquiries", async (req, res, next) => {
    try {
      const parsed = insertPartnerInquirySchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: parsed.error.errors[0]?.message ?? "Invalid inquiry" });
      }
      await storage.createPartnerInquiry(parsed.data);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — inventory
  // =========================================================================

  // Homepage hero slideshow images (BT-22) — active slides in display order.
  // Managed in Unified Ops (upload/reorder/toggle); the homepage reads this to
  // rotate the hero. Returns only the fields the client needs.
  app.get("/api/hero-images", async (_req, res, next) => {
    try {
      const imgs = await storage.getActiveHeroImages();
      res.json(
        imgs.map((h) => ({ id: h.id, url: h.s3Url, alt: h.altText ?? "" })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Journal (public blog). Authored in Unified Ops; only PUBLISHED posts are
  // exposed here. Shapes mirror the old static content model so the client
  // renderer is unchanged: `date` is the publish date (ISO), `cover` the R2 URL.

  // Index — cards, newest first. No `blocks` (keeps the list payload light).
  app.get("/api/journal", async (_req, res, next) => {
    try {
      const posts = await storage.getPublishedJournalPosts();
      res.json(
        posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          date: (p.publishedAt ?? p.createdAt).toISOString().slice(0, 10),
          excerpt: p.excerpt,
          cover: p.coverUrl ?? undefined,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Single article — full post incl. blocks. 404 for unknown OR unpublished
  // slug, so a draft is never reachable even if its slug is guessed.
  app.get("/api/journal/:slug", async (req, res, next) => {
    try {
      const post = await storage.getPublishedJournalPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });
      res.json({
        slug: post.slug,
        title: post.title,
        date: (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10),
        excerpt: post.excerpt,
        cover: post.coverUrl ?? undefined,
        blocks: post.blocks,
      });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — /sitemap.xml (vercel.json rewrites it here; the old static file
  // is gone). DB-driven so new journal posts, properties, and rooms surface to
  // crawlers without a redeploy. Respects the UO page-visibility flags the
  // same way the client does (unset → visible).
  // =========================================================================
  app.get("/sitemap.xml", async (_req, res, next) => {
    try {
      const origin = process.env.PUBLIC_BASE_URL || "https://www.beniceproperties.com";
      const [ltrFlag, journalFlag, properties, posts] = await Promise.all([
        storage.getSetting("page_ltr_visible"),
        storage.getSetting("page_journal_visible"),
        storage.getProperties({ activeOnly: true }),
        storage.getPublishedJournalPosts(),
      ]);
      const ltrVisible = ltrFlag?.value !== "false";
      const journalVisible = journalFlag?.value !== "false";

      type SitemapEntry = { path: string; lastmod?: string; changefreq?: string; priority?: string };
      const entries: SitemapEntry[] = [
        { path: "/", changefreq: "weekly", priority: "1.0" },
        { path: "/str", changefreq: "weekly", priority: "0.9" },
        ...(ltrVisible ? [{ path: "/ltr", changefreq: "weekly", priority: "0.9" }] : []),
        { path: "/community", changefreq: "monthly", priority: "0.7" },
        { path: "/about", changefreq: "monthly", priority: "0.6" },
        { path: "/partner", changefreq: "monthly", priority: "0.7" },
      ];

      for (const p of properties) {
        if (p.type === "LTR" && !ltrVisible) continue;
        entries.push({ path: `/property/${p.id}`, changefreq: "weekly", priority: "0.8" });
        if (p.type === "COLIVING") {
          const rooms = await storage.getRoomsByProperty(p.id);
          for (const r of rooms) {
            entries.push({ path: `/room/${r.id}`, changefreq: "weekly", priority: "0.7" });
          }
        }
      }

      if (journalVisible) {
        entries.push({ path: "/journal", changefreq: "weekly", priority: "0.6" });
        for (const post of posts) {
          entries.push({
            path: `/journal/${post.slug}`,
            lastmod: (post.updatedAt ?? post.publishedAt ?? post.createdAt)
              .toISOString()
              .slice(0, 10),
            changefreq: "monthly",
            priority: "0.6",
          });
        }
      }

      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        entries
          .map((e) => {
            const parts = [`    <loc>${origin}${e.path}</loc>`];
            if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
            if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
            if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
            return `  <url>\n${parts.join("\n")}\n  </url>`;
          })
          .join("\n") +
        `\n</urlset>\n`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.send(xml);
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — /feed.xml (RSS 2.0 for the Journal). Same model as /sitemap.xml:
  // DB-driven and served per request, so a UO content batch appears in the feed
  // without a redeploy, and vercel.json rewrites the path here (the SPA
  // catch-all excludes anything containing a dot, so the rewrite is required).
  // Honors page_journal_visible exactly as the sitemap does — hiding the Journal
  // in UO must not leave a syndicated back door open.
  // =========================================================================
  app.get("/feed.xml", async (_req, res, next) => {
    try {
      const origin = process.env.PUBLIC_BASE_URL || "https://www.beniceproperties.com";
      const [journalFlag, posts] = await Promise.all([
        storage.getSetting("page_journal_visible"),
        storage.getPublishedJournalPosts(),
      ]);
      // Unset → visible, matching the sitemap and the client.
      const journalVisible = journalFlag?.value !== "false";
      // Already ordered newest-first by the storage layer.
      const items = journalVisible ? posts : [];

      // blocks[] is the article body — a typed union, never HTML or markdown, so
      // every text node is escaped on the way out and the markup here is the only
      // markup in the payload.
      const blocksToHtml = (blocks: JournalBlock[]): string =>
        blocks
          .map((b) => {
            if (b.type === "heading") return `<h2>${xmlEscape(b.text)}</h2>`;
            if (b.type === "paragraph") return `<p>${xmlEscape(b.text)}</p>`;
            if (b.type === "image" && b.src)
              return `<p><img src="${xmlEscape(b.src)}" alt="${xmlEscape(b.alt)}" /></p>`;
            return "";
          })
          .filter(Boolean)
          .join("\n");

      const feedUrl = `${origin}/feed.xml`;
      // RFC-822 (via RFC-1123) is what RSS 2.0 wants; toUTCString() emits it.
      // Note this uses the full timestamp, not the API's date-only slice.
      const lastBuild = (
        items[0]?.updatedAt ??
        items[0]?.publishedAt ??
        items[0]?.createdAt ??
        new Date()
      ).toUTCString();

      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
        `  <channel>\n` +
        `    <title>Be Nice Properties Journal</title>\n` +
        `    <link>${origin}/journal</link>\n` +
        `    <description>Notes from the homes: booking direct, what's included, and making the most of a stay, straight from the people who run the places.</description>\n` +
        `    <language>en-us</language>\n` +
        `    <lastBuildDate>${lastBuild}</lastBuildDate>\n` +
        `    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />\n` +
        items
          .map((post) => {
            const url = `${origin}/journal/${post.slug}`;
            const pubDate = (post.publishedAt ?? post.createdAt).toUTCString();
            // The cover leads the body rather than riding in an <enclosure>: we
            // don't know the byte length RSS requires there, and a fabricated
            // one trips feed validators. Readers pick up the first <img> anyway.
            const cover = post.coverUrl
              ? `<p><img src="${xmlEscape(post.coverUrl)}" alt="${xmlEscape(post.title)}" /></p>\n`
              : "";
            const body = cover + blocksToHtml(post.blocks);
            return (
              `    <item>\n` +
              `      <title>${xmlEscape(post.title)}</title>\n` +
              `      <link>${url}</link>\n` +
              `      <guid isPermaLink="true">${url}</guid>\n` +
              `      <description>${xmlEscape(post.excerpt)}</description>\n` +
              `      <pubDate>${pubDate}</pubDate>\n` +
              // No author column exists on journal_posts, so the org is the
              // author — same choice journal-article.tsx makes for BlogPosting.
              `      <dc:creator>Be Nice Properties</dc:creator>\n` +
              `      <content:encoded>${xmlEscape(body)}</content:encoded>\n` +
              `    </item>`
            );
          })
          .join("\n") +
        `\n  </channel>\n</rss>\n`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.send(xml);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/properties", async (req, res, next) => {
    try {
      const today = todayIso();
      // Optional date-aware search. When BOTH checkIn+checkOut are present, valid,
      // forward, and not in the past, the grid filters + re-prices for that range
      // (STR: no direct/Airbnb conflict; COLIVING: from-price = cheapest room free
      // for the range, availability = ≥1 room free). With no/invalid dates the
      // grid behaves exactly as before — status-based availability + from-price.
      const ISO = /^\d{4}-\d{2}-\d{2}$/;
      const ci = typeof req.query.checkIn === "string" ? req.query.checkIn : "";
      const co = typeof req.query.checkOut === "string" ? req.query.checkOut : "";
      const dated =
        ISO.test(ci) && ISO.test(co) && co > ci && ci >= today
          ? { checkIn: ci, checkOut: co }
          : null;
      // Searched stay length in NIGHTS (same basis as the booking flow). A
      // co-living stay under the 7-night minimum can't be booked, so co-living is
      // disqualified for such a search regardless of room date-availability.
      const searchNights = dated
        ? differenceInCalendarDays(parseISO(dated.checkOut), parseISO(dated.checkIn))
        : 0;
      const colivingBelowMin = Boolean(dated) && searchNights < COLIVING_MIN_DAYS;

      const props = await storage.getProperties({ activeOnly: true });
      const withRent = await Promise.all(
        props.map(async (p) => {
          // Co-living cards price "from" the cheapest room a guest can actually
          // book. Date-blind default: rooms not pulled off the market
          // (ROOM_UNBOOKABLE_STATUSES: HOLD/MAINTENANCE/INACTIVE — OCCUPIED does
          // NOT disqualify a room here). Dated search: those rooms AND free for
          // [checkIn, checkOut) (leases ∪ Airbnb ∪ manual ∪ direct bookings).
          // null fromWeeklyRent → card shows "Fully booked" / unavailable.
          let fromWeeklyRent: string | null = null;
          let availableForDates = true;
          if (p.type === "COLIVING") {
            const rooms = await storage.getRoomsByProperty(p.id);
            const openRooms = rooms.filter((r) => isRoomBookableStatus(r.status));
            // Pair each open room with whether it's free for the searched range
            // (date-blind default: all open rooms count as free). The pure
            // cheapestAvailableWeeklyRent picks the from-price + availability.
            let free: boolean[];
            if (dated) {
              free = await Promise.all(
                openRooms.map((r) =>
                  storage.isRoomAvailableForRange({
                    roomId: r.id,
                    startDate: dated.checkIn,
                    endDate: dated.checkOut,
                    endExclusive: true,
                  }),
                ),
              );
            } else {
              free = openRooms.map(() => true);
            }
            const priced = cheapestAvailableWeeklyRent(
              openRooms.map((r, i) => ({ weeklyRent: r.weeklyRent, available: free[i] })),
            );
            fromWeeklyRent = priced.fromWeeklyRent;
            // Only assert unavailability for a dated search; with no dates the card
            // falls back to status/nextOpening (availableForDates stays true).
            // A sub-minimum range disqualifies co-living outright (can't book <7
            // nights) even if a room is otherwise free for those dates.
            if (dated) availableForDates = colivingBelowMin ? false : priced.available;
          } else if (p.type === "STR" && dated) {
            // Whole-property STR: available iff no direct/Airbnb conflict for the
            // searched range — same overlap rule the checkout flow enforces.
            availableForDates = !(await strHasConflict(p.id, dated.checkIn, dated.checkOut));
          }
          return { ...p, fromWeeklyRent, availableForDates };
        }),
      );

      // "Next opening" for currently-unavailable inventory — two batched
      // queries across all properties, then pure math (lib/nextOpening.ts).
      // Independent of the searched range: it answers "when does this open",
      // always relative to today.
      const bookedColivingIds = withRent
        .filter((p) => p.type === "COLIVING" && p.fromWeeklyRent === null)
        .map((p) => p.id);
      const strIds = withRent.filter((p) => p.type === "STR").map((p) => p.id);
      const [leaseEnds, strBookings] = await Promise.all([
        storage.getSoonestOccupyingLeaseEndByProperty(bookedColivingIds, today),
        storage.getStrBookingsEndingOnOrAfter(strIds, today),
      ]);

      const list: PropertyListItem[] = withRent.map((p) => {
        let nextOpening: string | null = null;
        if (p.type === "COLIVING" && p.fromWeeklyRent === null) {
          // Lease endDate is the last occupied night; opening is the next day.
          nextOpening = leaseEnds[p.id] ? dayAfter(leaseEnds[p.id]) : null;
        } else if (p.type === "STR") {
          nextOpening = strNextOpening(
            strBookings.filter((b) => b.propertyId === p.id),
            today,
          );
        }
        return { ...p, nextOpening };
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/properties/:id", async (req, res, next) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property || !property.active) {
        return res.status(404).json({ message: "Property not found" });
      }
      // Optional date-aware search (same validation as the grid handler). When a
      // valid forward, not-past range is supplied, each room reports whether it's
      // actually bookable for THOSE dates so the room cards can grey out an
      // Airbnb/lease/manual-blocked room even when its status permits booking
      // (e.g. OCCUPIED, which no longer blocks a future free range on its own).
      const today = todayIso();
      const ISO = /^\d{4}-\d{2}-\d{2}$/;
      const ci = typeof req.query.checkIn === "string" ? req.query.checkIn : "";
      const co = typeof req.query.checkOut === "string" ? req.query.checkOut : "";
      const dated =
        ISO.test(ci) && ISO.test(co) && co > ci && ci >= today
          ? { checkIn: ci, checkOut: co }
          : null;

      const baseRooms =
        property.type === "COLIVING" ? await storage.getRoomsByProperty(property.id) : [];
      // Per-room availability for the searched range — roomAvailableForDates is
      // the single source of truth for this field (its status gate,
      // isRoomBookableStatus, is the same one the grid handler above uses for
      // openRooms): no dates → true regardless of status (back-compat; the card
      // falls back to room.status); dated → not pulled off the market
      // (ROOM_UNBOOKABLE_STATUSES) AND free for [checkIn, checkOut) (leases ∪
      // Airbnb ∪ manual ∪ direct bookings). OCCUPIED does NOT disqualify a room —
      // only a real date overlap does.
      const rooms: RoomWithAvailability[] = await Promise.all(
        baseRooms.map(async (r) => ({ ...r, availableForDates: await roomAvailableForDates(r, dated) })),
      );
      res.json({ property, rooms });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/rooms/:id", async (req, res, next) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) return res.status(404).json({ message: "Room not found" });
      const property = await storage.getProperty(room.propertyId);
      res.json({ room, property });
    } catch (err) {
      next(err);
    }
  });

  // --- Availability (calendar disabled-date source) ---
  // Merged busy ranges (direct bookings/leases ∪ external Airbnb iCal blocks) so
  // the guest calendar can disable already-booked dates. Public (read-only, no PII).
  app.get("/api/properties/:id/availability", async (req, res, next) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property || !property.active) {
        return res.status(404).json({ message: "Property not found" });
      }
      // Whole-property STR calendar is meaningless for a co-living parent (rooms
      // are booked individually) — return an empty busy set rather than error.
      if (property.type !== "STR") {
        return res.json({ busy: [], minDate: todayIso() });
      }
      res.json(await buildStrAvailability(property.id));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/rooms/:id/availability", async (req, res, next) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) return res.status(404).json({ message: "Room not found" });
      res.json(await buildRoomAvailability(room.id));
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — quote (method-aware; computed server-side)
  // =========================================================================
  app.post("/api/quote", async (req, res, next) => {
    try {
      const parsed = quoteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid quote request" });
      }
      const { propertyId, roomId, checkIn, checkOut, paymentMethod } = parsed.data;
      const resolved = await resolveBooking({ propertyId, roomId, checkIn, checkOut });
      res.json(buildQuote(resolved, paymentMethod));
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — short-stay booking INTENT (payment-first, TRAD model)
  //   Creates ONLY a Stripe PaymentIntent (no booking/payment row). All the data
  //   needed to rebuild the booking rides in the PI metadata; the webhook
  //   (payment_intent.succeeded) materializes the booking after payment. So an
  //   abandoned checkout leaves ZERO db footprint and blocks NO dates.
  //   Guest contact is optional here (Element mounts on load) and attached later
  //   via /api/booking-intent/:id/contact before the guest confirms payment.
  // =========================================================================
  app.post("/api/booking-intent", async (req, res, next) => {
    try {
      const parsed = bookingIntentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid request" });
      }
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet (Stripe key not set)." });
      }
      const { propertyId, roomId, checkIn, checkOut, guest } = parsed.data;

      // resolveBooking applies the same lease-vs-booking gate + availability check
      // as /api/quote; anything that resolves is bookable as a short stay.
      const resolved = await resolveBooking({ propertyId, roomId, checkIn, checkOut });
      const quote = buildQuote(resolved, "STRIPE");
      const reference = generateReference();
      const dueNow = quote.dueNow.total;
      const surcharge = quote.dueNow.surcharge;

      const metadata = buildShortStayIntentMetadata({
        entity: resolved.property.entity,
        property: resolved.property,
        room: resolved.room ?? null,
        model: resolved.model,
        checkIn: resolved.checkIn,
        checkOut: resolved.checkOut,
        reference,
        quotedTotal: dueNow,
        amount: dueNow - surcharge,
        surcharge,
        rateCadence: resolved.model === "COLIVING" ? "WEEKLY" : resolved.rateTier ?? null,
        guest: guest ?? undefined,
      });

      const paymentIntent = await createOneTimePaymentIntent({
        amount: dueNow,
        guestEmail: guest?.email ?? "",
        reference,
        metadata,
        idempotencyKey: `intent:${reference}`,
      });

      res.json({
        reference,
        clientSecret: paymentIntent.client_secret,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY,
        paymentIntentId: paymentIntent.id,
        quote,
      });
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Attach final guest contact to a booking intent before the guest pays. This is
  // the server-side "no email → no booking" gate: the webhook won't materialize a
  // booking whose metadata lacks a guest email, and this is what fills it in.
  app.post("/api/booking-intent/:id/contact", async (req, res, next) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "Name required"),
        email: z.string().email("Valid email required"),
        phone: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid contact" });
      }
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet." });
      }
      await updatePaymentIntentContact({
        paymentIntentId: req.params.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — co-living lease quote (full payment-schedule preview, Phase 2)
  // Creates nothing, charges nothing. Returns the schedule the guest will sign
  // (Phase 3) and pay (Phase 4), computed by the shared canonical generator.
  // =========================================================================
  app.post("/api/lease-quote", async (req, res, next) => {
    try {
      const parsed = leaseQuoteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: parsed.error.errors[0]?.message ?? "Invalid lease quote request" });
      }
      res.json(await buildLeaseQuote(parsed.data));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — co-living lease creation + e-signature (Phase 3). No payment here.
  // =========================================================================

  // Render the agreement for review WITHOUT persisting a lease (no room hold).
  // The sign page calls this on load; the real lease is only created on sign.
  app.post("/api/leases/preview", async (req, res, next) => {
    try {
      const parsed = createDraftLeaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid lease request" });
      }
      const { documentHtml } = await previewLease(parsed.data);
      res.json({ documentHtml });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Create the DRAFT (→ PENDING_SIGNATURE) lease + persisted schedule, and
  // return the agreement rendered for review.
  app.post("/api/leases", async (req, res, next) => {
    try {
      const parsed = createDraftLeaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid lease request" });
      }
      const { lease, documentHtml } = await createDraftLease(parsed.data);
      posthog.identify({
        distinctId: parsed.data.guest.email,
        properties: { name: parsed.data.guest.name, email: parsed.data.guest.email, phone: parsed.data.guest.phone ?? undefined },
      });
      posthog.capture({
        distinctId: parsed.data.guest.email,
        event: "lease_created",
        properties: {
          lease_id: lease.id,
          property_id: parsed.data.propertyId,
          room_ids: parsed.data.roomIds,
          start_date: parsed.data.startDate,
          end_date: parsed.data.endDate,
          cadence: parsed.data.cadence,
        },
      });
      res.status(201).json({ leaseId: lease.id, status: lease.status, documentHtml });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Fetch a lease + its schedule + the review document (for the sign page).
  app.get("/api/leases/:id", async (req, res, next) => {
    try {
      const lease = await storage.getLease(req.params.id);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      const leaseRooms = await storage.getLeaseRooms(lease.id);
      const schedule = await storage.getScheduleByLease(lease.id);
      const guest = await storage.getGuest(lease.guestId);
      res.json({
        lease: {
          id: lease.id,
          status: lease.status,
          startDate: lease.startDate,
          endDate: lease.endDate,
          paymentCadence: lease.paymentCadence,
          weeklyRateSnapshot: lease.weeklyRateSnapshot,
          totalLeaseValue: lease.totalLeaseValue,
          prorationNote: lease.prorationNote,
          signedAt: lease.signedAt,
          signedName: lease.signedName,
          signedPdfUrl: lease.signedPdfUrl,
        },
        rooms: leaseRooms.map((lr) => ({ name: lr.roomNameSnapshot, roomNumber: lr.roomNumberSnapshot })),
        schedule: schedule.map((s) => ({
          seq: s.scheduleSeq,
          dueDate: s.dueDate,
          amount: s.amount,
          status: s.status,
        })),
        guest: guest ? { name: guest.name, email: guest.email } : null,
      });
    } catch (err) {
      next(err);
    }
  });

  // Sign the lease (typed name + affirmation). Captures timestamp + IP server-side.
  app.post("/api/leases/:id/sign", async (req, res, next) => {
    try {
      const parsed = signLeaseSchema.safeParse({ ...req.body, leaseId: req.params.id });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid signature" });
      }
      const fwd = req.headers["x-forwarded-for"];
      const ip =
        (typeof fwd === "string" ? fwd.split(",")[0]?.trim() : undefined) ||
        req.socket.remoteAddress ||
        "unknown";
      const { lease, documentUrl } = await signLease({
        leaseId: parsed.data.leaseId,
        signedName: parsed.data.signedName,
        affirmed: parsed.data.affirmed,
        ip,
      });
      const signedGuest = await storage.getGuest(lease.guestId);
      if (signedGuest) {
        posthog.capture({
          distinctId: signedGuest.email,
          event: "lease_signed",
          properties: {
            lease_id: lease.id,
            property_id: lease.propertyId,
            signed_name: parsed.data.signedName,
            cadence: lease.paymentCadence,
            total_lease_value: lease.totalLeaseValue,
          },
        });
      }
      res.json({ leaseId: lease.id, status: lease.status, documentUrl });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Serve the signed agreement HTML (guest re-download, anytime). Falls back to
  // the review render if not yet signed.
  app.get("/api/leases/:id/document", async (req, res, next) => {
    try {
      const lease = await storage.getLease(req.params.id);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      if (!lease.signedDocumentHtml) {
        return res.status(409).json({ message: "Lease has not been signed yet" });
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(lease.signedDocumentHtml);
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // GUEST PORTAL (Phase 6) — token-authenticated self-serve. The token is the
  // credential; no session needed.
  // =========================================================================
  app.get("/api/portal/:token", async (req, res, next) => {
    try {
      res.json(await getPortalView(req.params.token));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Pay an open installment now (early pay, or settle a LATE/FAILED row) against
  // the saved card; also bills that installment's accrued late fees.
  app.post("/api/portal/:token/pay/:seq", async (req, res, next) => {
    try {
      const seq = parseInt(req.params.seq, 10);
      if (!Number.isFinite(seq)) return res.status(400).json({ message: "Invalid installment" });
      const payResult = await payInstallmentNow(req.params.token, seq);
      const portalData = await getPortalView(req.params.token).catch(() => null);
      const portalGuestEmail = portalData?.guest?.email;
      if (portalGuestEmail) {
        posthog.capture({
          distinctId: portalGuestEmail,
          event: "portal_installment_paid",
          properties: {
            portal_token: req.params.token,
            schedule_seq: seq,
          },
        });
      }
      res.json(payResult);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Elect to pay an open installment MANUALLY (CashApp / Zelle) instead of by
  // card. Flips the row to MANUAL and returns pay-to instructions; the payment is
  // held pending until an admin settles it via UO "Mark Paid". Not Stripe-gated —
  // this is the no-card path.
  app.post("/api/portal/:token/pay/:seq/manual", async (req, res, next) => {
    try {
      const seq = parseInt(req.params.seq, 10);
      if (!Number.isFinite(seq)) return res.status(400).json({ message: "Invalid installment" });
      const schema = z.object({ method: z.enum(["CASHAPP", "ZELLE"]) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "method must be CASHAPP or ZELLE" });

      const instructions = await electManualInstallment(req.params.token, seq, parsed.data.method);

      const portalData = await getPortalView(req.params.token).catch(() => null);
      const portalGuestEmail = portalData?.guest?.email;
      if (portalGuestEmail) {
        posthog.capture({
          distinctId: portalGuestEmail,
          event: "portal_installment_manual_elected",
          properties: {
            portal_token: req.params.token,
            schedule_seq: seq,
            method: parsed.data.method,
            amount: instructions.amount,
          },
        });
      }
      res.json(instructions);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Submit a question / maintenance request (creates a thread root).
  app.post("/api/portal/:token/messages", async (req, res, next) => {
    try {
      const schema = z.object({
        category: z.enum(["QUESTION", "MAINTENANCE", "OTHER"]).optional(),
        subject: z.string().max(200).optional(),
        body: z.string().min(1, "Message can't be empty").max(5000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const msg = await submitMessage(req.params.token, parsed.data);
      const msgPortalData = await getPortalView(req.params.token).catch(() => null);
      const msgGuestEmail = msgPortalData?.guest?.email;
      if (msgGuestEmail) {
        posthog.capture({
          distinctId: msgGuestEmail,
          event: "guest_message_submitted",
          properties: {
            category: parsed.data.category ?? null,
            subject: parsed.data.subject ?? null,
          },
        });
      }
      res.status(201).json({ threadId: msg.id, status: msg.status });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Fetch a thread (status check + history).
  app.get("/api/portal/:token/messages/:threadId", async (req, res, next) => {
    try {
      res.json(await getThread(req.params.token, req.params.threadId));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Reply to a thread.
  app.post("/api/portal/:token/messages/:threadId/reply", async (req, res, next) => {
    try {
      const schema = z.object({ body: z.string().min(1).max(5000) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const reply = await replyToThread(req.params.token, req.params.threadId, parsed.data.body);
      res.status(201).json({ id: reply.id });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // TENANT VERIFICATION (Phase 6.5) — token-authenticated, portal-side. Upload a
  // driver's license (moves lease → PENDING_REVIEW) + optional vehicle info. The
  // license/vehicle-photo routes take multipart/form-data (field "file") parsed
  // by multer in-memory; the vehicle route is JSON.
  // -------------------------------------------------------------------------
  app.post("/api/portal/:token/license", upload.single("file"), async (req, res, next) => {
    try {
      const result = await uploadLicense(req.params.token, toUploadedFile(req.file));
      const licPortalData = await getPortalView(req.params.token).catch(() => null);
      const licGuestEmail = licPortalData?.guest?.email;
      if (licGuestEmail) {
        posthog.capture({
          distinctId: licGuestEmail,
          event: "license_uploaded",
          properties: { portal_token: req.params.token },
        });
      }
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  app.post("/api/portal/:token/vehicle", async (req, res, next) => {
    try {
      const schema = z.object({
        hasVehicle: z.boolean(),
        make: z.string().max(60).nullish(),
        model: z.string().max(60).nullish(),
        year: z.number().int().min(1900).max(2100).nullish(),
        color: z.string().max(40).nullish(),
        plate: z.string().max(15).nullish(),
        plateState: z.enum(US_STATE_CODES).nullish(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const vehicle = await saveVehicle(req.params.token, parsed.data);
      res.status(200).json({ id: vehicle.id, hasVehicle: vehicle.hasVehicle });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  app.post("/api/portal/:token/vehicle-photo", upload.single("file"), async (req, res, next) => {
    try {
      const result = await uploadVehiclePhoto(req.params.token, toUploadedFile(req.file));
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Start the co-living first payment (Phase 4). Creates a Stripe Customer + a
  // PaymentIntent that saves the card; returns the client secret for Elements.
  // Booking becomes ACTIVE only after Stripe confirms success (webhook).
  app.post("/api/leases/:id/first-payment", async (req, res, next) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet (Stripe test key not set)." });
      }
      const result = await startFirstPayment(req.params.id);
      res.json({
        clientSecret: result.clientSecret,
        amount: result.amount,
        portalToken: result.portalToken,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY,
      });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Start the co-living DEPOSIT payment (secures the room). Creates a Stripe
  // Customer + a PaymentIntent for the refundable deposit that saves the card;
  // returns the client secret for Elements. Paying it flips the room(s) to
  // OCCUPIED and then charges the first week off-session (webhook).
  app.post("/api/leases/:id/deposit", async (req, res, next) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet (Stripe test key not set)." });
      }
      const result = await startDepositPayment(req.params.id);
      const depositLease = await storage.getLease(req.params.id);
      if (depositLease) {
        const depositGuest = await storage.getGuest(depositLease.guestId);
        if (depositGuest) {
          posthog.capture({
            distinctId: depositGuest.email,
            event: "deposit_payment_started",
            properties: {
              lease_id: req.params.id,
              property_id: depositLease.propertyId,
              amount: result.amount,
            },
          });
        }
      }
      res.json({
        clientSecret: result.clientSecret,
        amount: result.amount,
        portalToken: result.portalToken,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY,
      });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Expose whether card payments are live (drives the client payment UI).
  app.get("/api/payments/config", (_req, res) => {
    res.json({
      stripeEnabled: isStripeConfigured() && stripePublishableConfigured(),
      publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY ?? null,
    });
  });

  // Admin: read/update the DEFAULTED threshold (days unpaid → lease DEFAULTED).
  // Admin-configurable per the spec — not a magic number.
  app.get("/api/admin/settings/default-threshold", requireAdmin, async (_req, res, next) => {
    try {
      const days = await storage.getSettingNumber("defaulted_threshold_days", 7);
      res.json({ defaultedThresholdDays: days });
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/admin/settings/default-threshold", requireAdmin, async (req, res, next) => {
    try {
      const schema = z.object({ days: z.number().int().min(1).max(120) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "days must be an integer 1–120" });
      await storage.setSetting("defaulted_threshold_days", String(parsed.data.days));
      res.json({ defaultedThresholdDays: parsed.data.days });
    } catch (err) {
      next(err);
    }
  });

  // Admin: refund a lease's refundable security deposit (e.g. at move-out).
  app.post("/api/admin/leases/:id/refund-deposit", requireAdmin, async (req, res, next) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled (Stripe key not set)." });
      }
      await refundDeposit(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // -------------------------------------------------------------------------
  // ADMIN — tenant identity verification review (Phase 6.5). List the queue,
  // view an uploaded license (short-lived presigned URL — never public), and
  // approve (verifies name → activates lease) or reject (notifies tenant).
  // -------------------------------------------------------------------------
  function adminActor(req: express.Request): string {
    const u = req.user as { email?: string; id?: string } | undefined;
    return u?.email || u?.id || "admin";
  }

  // Leases awaiting ID review, with the guest + typed lease name for comparison.
  app.get("/api/admin/verifications", requireAdmin, async (_req, res, next) => {
    try {
      const leases = await storage.getLeases({ status: "PENDING_VERIFICATION" });
      const pending = leases.filter((l) => l.verificationStatus === "PENDING_REVIEW");
      const rows = await Promise.all(
        pending.map(async (l) => {
          const [guest, property, leaseRooms] = await Promise.all([
            storage.getGuest(l.guestId),
            storage.getProperty(l.propertyId),
            storage.getLeaseRooms(l.id),
          ]);
          return {
            leaseId: l.id,
            signedName: l.signedName, // the name the tenant signed with
            guestName: guest?.name ?? null,
            guestEmail: guest?.email ?? null,
            propertyName: property?.name ?? null,
            rooms: leaseRooms.map((r) => r.roomNameSnapshot),
            licenseUploadedAt: l.licenseUploadedAt,
            startDate: l.startDate,
          };
        }),
      );
      res.json({ verifications: rows });
    } catch (err) {
      next(err);
    }
  });

  // Presigned URL to view a lease's uploaded license (600s; private object).
  app.get("/api/admin/leases/:id/license-url", requireAdmin, async (req, res, next) => {
    try {
      res.json(await getLicenseViewUrl(req.params.id));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Approve verification → verifies name + activates the lease.
  app.post("/api/admin/leases/:id/approve-verification", requireAdmin, async (req, res, next) => {
    try {
      const approveResult = await approveVerification(req.params.id, adminActor(req));
      const verifiedLease = await storage.getLease(req.params.id);
      if (verifiedLease) {
        const verifiedGuest = await storage.getGuest(verifiedLease.guestId);
        if (verifiedGuest) {
          posthog.capture({
            distinctId: verifiedGuest.email,
            event: "verification_approved",
            properties: {
              lease_id: req.params.id,
              property_id: verifiedLease.propertyId,
              actor: adminActor(req),
            },
          });
        }
      }
      res.json(approveResult);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Reject verification → records reason + notifies tenant to re-upload.
  app.post("/api/admin/leases/:id/reject-verification", requireAdmin, async (req, res, next) => {
    try {
      const schema = z.object({ reason: z.string().min(1, "A reason is required").max(500) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await rejectVerification(req.params.id, parsed.data.reason, adminActor(req)));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Admin: open escalations raised by this app (Phase 8 UO consumes/resolves).
  app.get("/api/admin/escalations", requireAdmin, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : "OPEN";
      res.json(await storage.getEscalations({ status }));
    } catch (err) {
      next(err);
    }
  });

  // Admin reconciliation report (same builder as the UO route).
  app.get("/api/admin/reconciliation-report", requireAdmin, reconciliationHandler);

  // =========================================================================
  // PUBLIC — create booking (MANUAL only: CashApp / Zelle)
  //   Card (STRIPE) short stays no longer go through here — they are payment-first
  //   via /api/booking-intent, and the booking is materialized by the webhook
  //   after payment. Only the manual path creates a PENDING_PAYMENT booking up
  //   front (settled later via UO "Mark Paid").
  // =========================================================================
  app.post("/api/bookings", async (req, res, next) => {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid booking" });
      }
      const { propertyId, roomId, checkIn, checkOut, paymentMethod, guest } = parsed.data;

      // Card payments are payment-first now — route them to /api/booking-intent so
      // no pending row (and no date hold) is created before the guest actually pays.
      if (paymentMethod === "STRIPE") {
        return res.status(400).json({
          message: "Card payments use /api/booking-intent (payment-first).",
        });
      }

      // resolveBooking applies the lease-vs-booking gate: STR whole-property
      // stays and SHORT co-living stays (7–28 nights, paid in full upfront, no
      // lease) resolve here; a co-living stay over 28 nights is rejected with a
      // 409 pointing back to the lease flow, and under 7 nights is rejected as
      // below the co-living minimum. So anything that resolves is bookable here.
      const resolved = await resolveBooking({ propertyId, roomId, checkIn, checkOut });

      const quote = buildQuote(resolved, paymentMethod);
      const reference = generateReference();
      const dueNow = quote.dueNow.total;

      // Manual (CashApp/Zelle): create the guest + a PENDING_PAYMENT booking + a
      // PENDING payment row. Settled later via UO "Mark Paid".
      const guestRow = await storage.upsertGuestByEmail(guest);
      const booking = await storage.createBooking({
        propertyId: resolved.property.id,
        roomId: resolved.room?.id ?? null,
        guestId: guestRow.id,
        model: resolved.model,
        checkIn: resolved.checkIn,
        checkOut: resolved.checkOut,
        status: "PENDING_PAYMENT",
        paymentMethod,
        reference,
        quotedTotal: String(dueNow),
      });

      const response: CreateBookingResponse = {
        reference,
        bookingId: booking.id,
        paymentMethod,
        quote,
      };

      // CASHAPP / ZELLE — manual, no surcharge, pending until admin confirms.
      await storage.createPayment({
        bookingId: booking.id,
        type: "ONE_TIME",
        method: paymentMethod,
        amount: String(dueNow),
        surcharge: "0",
        status: "PENDING",
        stripeRef: null,
        confirmedBy: null,
        paidAt: null,
      });
      response.manualInstructions = buildManualInstructions({
        method: paymentMethod,
        amount: dueNow,
        memo: reference,
      });

      posthog.identify({
        distinctId: guest.email,
        properties: { name: guest.name, email: guest.email, phone: guest.phone ?? undefined },
      });
      posthog.capture({
        distinctId: guest.email,
        event: "booking_created",
        properties: {
          reference,
          property_id: resolved.property.id,
          property_name: resolved.property.name,
          property_type: resolved.model,
          room_id: resolved.room?.id ?? null,
          check_in: resolved.checkIn,
          check_out: resolved.checkOut,
          payment_method: paymentMethod,
          quoted_total: dueNow,
        },
      });
      res.status(201).json(response);
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — guest booking lookup (reference + email)
  // =========================================================================
  app.get("/api/lookup", async (req, res, next) => {
    try {
      const schema = z.object({ reference: z.string().min(1), email: z.string().email() });
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ message: "Provide reference and email" });

      const booking = await storage.getBookingByReference(parsed.data.reference);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      const guest = await storage.getGuest(booking.guestId);
      // Verify the email matches the booking's guest (lightweight auth).
      if (!guest || guest.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const property = await storage.getProperty(booking.propertyId);
      const payments = await storage.getPaymentsByBooking(booking.id);
      const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
      res.json({
        booking,
        property: property ? { name: property.name, location: property.location } : null,
        room: room ? { name: room.name } : null,
        // Only payment status/amounts — no stripe refs to the public.
        payments: payments.map((p) => ({
          type: p.type,
          method: p.method,
          amount: p.amount,
          surcharge: p.surcharge,
          status: p.status,
          paidAt: p.paidAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // UO INTEGRATION (Phase 8) — service-token auth. BNP exposes; UO consumes.
  // Reads + constrained, idempotent write-backs. BNP owns its data.
  // =========================================================================
  const uoErr = (err: unknown, res: express.Response, next: express.NextFunction) => {
    if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
    next(err);
  };

  // --- Reads ---
  app.get("/api/uo/properties", requireServiceToken, async (_req, res, next) => {
    try { res.json(await uo.listPropertiesWithRooms()); } catch (e) { uoErr(e, res, next); }
  });
  app.get("/api/uo/leases", requireServiceToken, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(await uo.listLeases(status));
    } catch (e) { uoErr(e, res, next); }
  });
  app.get("/api/uo/leases/:id", requireServiceToken, async (req, res, next) => {
    try { res.json(await uo.getLeaseDetail(req.params.id)); } catch (e) { uoErr(e, res, next); }
  });
  app.get("/api/uo/payments", requireServiceToken, async (req, res, next) => {
    try {
      const leaseId = typeof req.query.leaseId === "string" ? req.query.leaseId : undefined;
      res.json(await uo.listPaymentsWithMetadata({ leaseId }));
    } catch (e) { uoErr(e, res, next); }
  });
  // NOTE: GET /api/uo/messages is registered later (Task 6, mountMessagingRoutes)
  // with the richer, shared listThreads view (guest/property/booking context) —
  // it supersedes the old lease-only uo.listGuestMessageThreads.
  app.get("/api/uo/escalations", requireServiceToken, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(await uo.listEscalations(status));
    } catch (e) { uoErr(e, res, next); }
  });

  // Reconciliation report (Phase 9): per-entity→property→room collected totals
  // for a date range (rent vs late, card vs manual), reconciled via metadata.
  // Handler (reconciliationHandler) is a module-level fn so both the UO and admin
  // routes can share it regardless of declaration order.
  app.get("/api/uo/reconciliation", requireServiceToken, reconciliationHandler);

  // --- Write-backs (constrained, idempotent) ---
  app.post("/api/uo/leases/:id/mark-paid", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ scheduleSeq: z.number().int(), note: z.string().min(1), actor: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.markPaid({ leaseId: req.params.id, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/leases/:id/approve", requireServiceToken, async (req, res, next) => {
    try {
      const actor = typeof req.body?.actor === "string" ? req.body.actor : "uo";
      res.json(await uo.approveLease(req.params.id, actor));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/messages/:threadId/respond", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ body: z.string().min(1), actor: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.respondToMessage({ threadId: req.params.threadId, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/escalations/:id/resolve", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ actor: z.string().min(1), status: z.enum(["ACKNOWLEDGED", "RESOLVED"]).optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.resolveEscalation({ escalationId: req.params.id, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/leases/:id/waive-late-fee", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ scheduleSeq: z.number().int(), reason: z.string().min(1), actor: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.waiveLateFees({ leaseId: req.params.id, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });

  // =========================================================================
  // TASK 6 — staff messaging (guest_messages threads), manual blocks
  // (off-platform/maintenance holds), the Airbnb iCal refresh trigger, the
  // guest picker, and the guest-auto-notifications toggle. One set of handlers
  // is shared between ADMIN (session auth, actor = the logged-in admin's
  // email — reuses `adminActor` below) and UO (service-token auth, actor =
  // a required `actor` field, prefixed "uo:" so message_log/manual_blocks
  // always show who really acted). `source` on a manual block records which
  // side created it.
  // =========================================================================
  function messagingErr(err: unknown, res: express.Response, next: express.NextFunction) {
    if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
    if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
    next(err);
  }

  // UO has no session — every write it makes must self-identify. GET routes
  // accept `?actor=` (service calls are rarely query-driven here, but reads
  // don't strictly need one); writes read it from the body.
  function uoActor(req: express.Request): string {
    const raw =
      typeof req.body?.actor === "string"
        ? req.body.actor
        : typeof req.query.actor === "string"
          ? req.query.actor
          : undefined;
    if (!raw) throw new LeaseError("actor is required", 400);
    return `uo:${raw}`;
  }

  const newThreadBodySchema = z.object({
    bookingId: z.string().optional(),
    leaseId: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().min(1),
    channels: z.array(z.enum(["EMAIL", "SMS"])),
  });
  const replyBodySchema = z.object({
    body: z.string().min(1),
    channels: z.array(z.enum(["EMAIL", "SMS"])),
  });
  const createBlockBodySchema = insertManualBlockSchema.omit({ source: true, createdBy: true });
  const autoNotifyBodySchema = z.object({ enabled: z.boolean() });
  const TERMINAL_LEASE_STATUSES = new Set<(typeof LEASE_STATUSES)[number]>([
    "COMPLETED",
    "TERMINATED",
    "DEFAULTED",
  ]);
  const GUEST_AUTO_NOTIFY_KEY = "guest_auto_notifications_enabled";

  function messageHandlers(source: "ADMIN" | "UO", actorFrom: (req: express.Request) => string) {
    return {
      listThreads: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const status = typeof req.query.status === "string" ? req.query.status : undefined;
          res.json({ threads: await adminMessages.listThreads(status ? { status } : undefined) });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      getThreadDetail: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          res.json(await adminMessages.getThread(req.params.threadId));
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      createThread: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const parsed = newThreadBodySchema.safeParse(req.body);
          if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
          const actor = actorFrom(req);
          res.json(await adminMessages.sendStaffMessage({ ...parsed.data, actor }));
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      reply: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const parsed = replyBodySchema.safeParse(req.body);
          if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
          const actor = actorFrom(req);
          res.json(
            await adminMessages.sendStaffMessage({ threadId: req.params.threadId, ...parsed.data, actor }),
          );
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      messageLog: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const bookingId = typeof req.query.bookingId === "string" ? req.query.bookingId : undefined;
          const leaseId = typeof req.query.leaseId === "string" ? req.query.leaseId : undefined;
          let limit = 200;
          if (typeof req.query.limit === "string") {
            const n = parseInt(req.query.limit, 10);
            if (Number.isFinite(n)) limit = Math.min(Math.max(n, 1), 1000);
          }
          res.json({ log: await storage.getMessageLog({ bookingId, leaseId, limit }) });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      listBlocks: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId : undefined;
          res.json({ blocks: await storage.getManualBlocks({ propertyId }) });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      createBlock: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const parsed = createBlockBodySchema.safeParse(req.body);
          if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
          if (parsed.data.endDate <= parsed.data.startDate) {
            return res.status(400).json({ message: "endDate must be after startDate" });
          }
          const actor = actorFrom(req);
          const block = await storage.createManualBlock({ ...parsed.data, source, createdBy: actor });
          res.json(block);
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      deleteBlock: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          await storage.deleteManualBlock(req.params.id);
          res.json({ ok: true });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      calendarRefresh: async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          res.json(await refreshExternalCalendars());
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      calendarStatus: async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const [lastSyncAtRow, lastResultRow] = await Promise.all([
            storage.getSetting("ical_last_sync_at"),
            storage.getSetting("ical_last_sync_result"),
          ]);
          let lastResult: unknown = null;
          if (lastResultRow?.value) {
            try {
              lastResult = JSON.parse(lastResultRow.value);
            } catch {
              lastResult = null;
            }
          }
          res.json({ lastSyncAt: lastSyncAtRow?.value ?? null, lastResult });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      // Guest picker: everyone currently reachable — active/upcoming bookings
      // plus non-terminal leases — with enough context (property, reference)
      // to start a new staff message thread against the right one.
      guests: async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const [bookingsWithGuest, leases] = await Promise.all([
            storage.getBookingsWithGuest({ from: todayIso() }),
            storage.getLeases(),
          ]);
          const activeLeases = leases.filter(
            (l) => !TERMINAL_LEASE_STATUSES.has(l.status as (typeof LEASE_STATUSES)[number]),
          );
          const leaseRows = await Promise.all(
            activeLeases.map(async (l) => {
              const [guest, property] = await Promise.all([
                storage.getGuest(l.guestId),
                storage.getProperty(l.propertyId),
              ]);
              return {
                leaseId: l.id,
                guestId: l.guestId,
                guestName: guest?.name ?? null,
                guestEmail: guest?.email ?? null,
                guestPhone: guest?.phone ?? null,
                propertyId: l.propertyId,
                propertyName: property?.name ?? null,
                status: l.status,
                startDate: l.startDate,
                endDate: l.endDate,
              };
            }),
          );
          const bookingRows = bookingsWithGuest.map((b) => ({
            bookingId: b.id,
            guestId: b.guestId,
            guestName: b.guest.name,
            guestEmail: b.guest.email,
            guestPhone: b.guest.phone,
            propertyId: b.propertyId,
            propertyName: b.property.name,
            reference: b.reference,
            status: b.status,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
          }));
          res.json({ bookings: bookingRows, leases: leaseRows });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      getAutoNotify: async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const row = await storage.getSetting(GUEST_AUTO_NOTIFY_KEY);
          // Default ON: absent a setting, guests keep getting the automated
          // lifecycle/dunning sends that already exist — this toggle is an
          // opt-OUT switch, not an opt-in one.
          res.json({ enabled: row ? row.value === "true" : true });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      putAutoNotify: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const parsed = autoNotifyBodySchema.safeParse(req.body);
          if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
          await storage.setSetting(GUEST_AUTO_NOTIFY_KEY, parsed.data.enabled ? "true" : "false");
          res.json({ enabled: parsed.data.enabled });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
    };
  }

  function mountMessagingRoutes(
    prefix: string,
    authMiddleware: express.RequestHandler,
    source: "ADMIN" | "UO",
    actorFrom: (req: express.Request) => string,
  ) {
    const h = messageHandlers(source, actorFrom);
    app.get(`${prefix}/messages`, authMiddleware, h.listThreads);
    app.get(`${prefix}/messages/:threadId`, authMiddleware, h.getThreadDetail);
    app.post(`${prefix}/messages`, authMiddleware, h.createThread);
    app.post(`${prefix}/messages/:threadId/reply`, authMiddleware, h.reply);
    app.get(`${prefix}/message-log`, authMiddleware, h.messageLog);
    app.get(`${prefix}/blocks`, authMiddleware, h.listBlocks);
    app.post(`${prefix}/blocks`, authMiddleware, h.createBlock);
    app.delete(`${prefix}/blocks/:id`, authMiddleware, h.deleteBlock);
    app.post(`${prefix}/calendar/refresh`, authMiddleware, h.calendarRefresh);
    app.get(`${prefix}/calendar/status`, authMiddleware, h.calendarStatus);
    app.get(`${prefix}/guests`, authMiddleware, h.guests);
    app.get(`${prefix}/settings/guest-auto-notifications`, authMiddleware, h.getAutoNotify);
    app.put(`${prefix}/settings/guest-auto-notifications`, authMiddleware, h.putAutoNotify);
  }

  // Admin variant mounted here; `adminActor` is declared further down (a
  // hoisted function declaration, so it's already callable from this point).
  mountMessagingRoutes("/api/admin", requireAdmin, "ADMIN", adminActor);
  mountMessagingRoutes("/api/uo", requireServiceToken, "UO", uoActor);

  // UO-only booking conflict resolution — the admin equivalents
  // (POST /api/admin/bookings/:id/confirm|cancel) already exist below.
  app.post("/api/uo/bookings/:id/confirm", requireServiceToken, async (req, res, next) => {
    try {
      const actor = uoActor(req);
      const booking = await confirmConflictBooking(req.params.id, actor);
      res.json({ ok: true, booking });
    } catch (e) {
      messagingErr(e, res, next);
    }
  });
  app.post("/api/uo/bookings/:id/cancel", requireServiceToken, async (req, res, next) => {
    try {
      const actor = uoActor(req);
      const refund = req.body?.refund === true;
      const result = await cancelBooking({ bookingId: req.params.id, actor, refund });
      res.json({ ok: true, ...result });
    } catch (e) {
      messagingErr(e, res, next);
    }
  });

  // =========================================================================
  // ADMIN (auth-gated)
  // =========================================================================
  app.get("/api/admin/dashboard", requireAdmin, async (_req, res, next) => {
    try {
      const agg = await storage.getKpiAggregates();
      const bookings = await storage.getBookings();
      const pending = await storage.getPendingManualPayments();
      res.json({ aggregates: agg, recentBookings: bookings.slice(0, 20), pendingCount: pending.length });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/bookings", requireAdmin, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(await storage.getBookings(status ? { status } : undefined));
    } catch (err) {
      next(err);
    }
  });

  // Cancel a booking (admin). Sets status → CANCELLED, which both availability
  // paths exclude (ne(status,"CANCELLED")), so the dates are released. Frees a
  // co-living room only when nothing else covers it today. Idempotent.
  //
  // MONEY: a refund happens ONLY when the admin explicitly passes
  // `{ refund: true }` — never as a side effect of cancelling. See
  // server/lib/bookingConflicts.ts.
  app.post("/api/admin/bookings/:id/cancel", requireAdmin, async (req, res, next) => {
    try {
      const refund = req.body?.refund === true;
      const result = await cancelBooking({
        bookingId: req.params.id,
        actor: adminActor(req),
        refund,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Confirm a paid CONFLICT booking (admin). Re-runs the availability gate
  // excluding this booking; 409s if the dates are still taken. On success the
  // booking goes live, the room is occupied, the escalation is resolved, and the
  // guest + admin confirmations fire.
  app.post("/api/admin/bookings/:id/confirm", requireAdmin, async (req, res, next) => {
    try {
      const booking = await confirmConflictBooking(req.params.id, adminActor(req));
      res.json({ ok: true, booking });
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Reconciliation queue: pending manual payments with booking + guest context.
  app.get("/api/admin/reconciliation", requireAdmin, async (_req, res, next) => {
    try {
      const pending = await storage.getPendingManualPayments();
      const enriched = await Promise.all(
        pending
          .filter((p) => p.method !== "STRIPE")
          .map(async (p) => {
            const booking = await storage.getBooking(p.bookingId);
            const guest = booking ? await storage.getGuest(booking.guestId) : null;
            return {
              payment: p,
              booking,
              guest: guest ? { name: guest.name, email: guest.email } : null,
            };
          }),
      );
      res.json(enriched);
    } catch (err) {
      next(err);
    }
  });

  // Mark a manual payment paid → confirm booking + record who/when.
  app.post("/api/admin/payments/:id/mark-paid", requireAdmin, async (req, res, next) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) return res.status(404).json({ message: "Payment not found" });
      if (payment.method === "STRIPE") {
        return res.status(400).json({ message: "Stripe payments are confirmed by webhook, not manually" });
      }
      const adminId = (req.user as { id: string }).id;
      const updated = await storage.updatePayment(payment.id, {
        status: "PAID",
        confirmedBy: adminId,
        paidAt: new Date(),
      });
      // Confirm the booking; activate co-living + occupy the room.
      const booking = await storage.getBooking(payment.bookingId);
      if (booking) {
        await storage.updateBooking(booking.id, {
          status: booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED",
        });
        if (booking.roomId) await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
        const manualGuest = await storage.getGuest(booking.guestId);
        if (manualGuest) {
          posthog.capture({
            distinctId: manualGuest.email,
            event: "manual_payment_confirmed",
            properties: {
              payment_id: payment.id,
              booking_id: payment.bookingId,
              booking_reference: booking.reference,
              payment_method: payment.method,
              amount: payment.amount,
              property_id: booking.propertyId,
              confirmed_by: adminActor(req),
            },
          });
          // Admin alert: an off-band payment just settled a booking.
          const settledTail =
            `marked PAID by ${adminActor(req)}. Booking is now ` +
            `${booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED"}.`;
          await notifyAdmin({
            subject: `Manual payment marked paid — ${booking.reference}`,
            body:
              `${payment.method} payment of $${payment.amount} for ${booking.reference} ` +
              `(${manualGuest.name}, ${manualGuest.email}) ${settledTail}`,
            // Telegram: name only, no contact details (third-party channel).
            telegramText:
              `${payment.method} payment of $${payment.amount} for ${booking.reference} ` +
              `(${manualGuest.name}) ${settledTail}`,
            context: {
              bookingId: booking.id,
              guestId: manualGuest.id,
              kind: "MANUAL_PAYMENT_CONFIRMED",
              sentBy: adminActor(req),
            },
          });
        }
      }
      res.json({ payment: updated });
    } catch (err) {
      next(err);
    }
  });

  // Payments / subscriptions read view.
  app.get("/api/admin/payments", requireAdmin, async (_req, res, next) => {
    try {
      const bookings = await storage.getBookings();
      const rows = await Promise.all(
        bookings.map(async (b) => ({
          booking: b,
          payments: await storage.getPaymentsByBooking(b.id),
          subscription: await storage.getSubscriptionByBooking(b.id),
        })),
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // ---- Inventory management ----
  app.post("/api/admin/properties", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertPropertySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await storage.createProperty(parsed.data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/admin/properties/:id", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertPropertySchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const updated = await storage.updateProperty(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Property not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/properties", requireAdmin, async (_req, res, next) => {
    try {
      res.json(await storage.getProperties());
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/properties/:id/rooms", requireAdmin, async (req, res, next) => {
    try {
      res.json(await storage.getRoomsByProperty(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/admin/rooms", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertRoomSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await storage.createRoom(parsed.data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/admin/rooms/:id", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertRoomSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const updated = await storage.updateRoom(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Room not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Manually trigger a KPI rollup + UO push (dry-run unless enabled).
  app.post("/api/admin/kpi/push", requireAdmin, async (_req, res, next) => {
    try {
      res.json({ snapshot: await buildAndPushSnapshot() });
    } catch (err) {
      next(err);
    }
  });

  // NOTE: Airbnb iCal feed URLs are managed from Unified-Ops (the primary BNP
  // admin), written to properties/rooms.airbnb_ical_url directly. BNP's sync
  // (server/lib/icalSync.ts, driven by the scheduler + hourly cron) reads those
  // URLs — there is no feed CRUD surface here.
}

// ===========================================================================
// Stripe webhook handler — SOURCE OF TRUTH for payment state.
// ===========================================================================
// Extract the subscription id from an invoice across Stripe SDK shapes. v18
// moved it off `invoice.subscription`; it now lives under the invoice line
// items' parent (subscription_item_details) or the invoice parent details.
function subIdFromInvoice(invoice: import("stripe").Stripe.Invoice): string | undefined {
  const anyInv = invoice as unknown as {
    subscription?: string | { id: string };
    parent?: { subscription_details?: { subscription?: string | { id: string } } };
    lines?: { data?: Array<{ parent?: { subscription_item_details?: { subscription?: string } } }> };
  };
  const direct = anyInv.subscription;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") return direct.id;
  const parentSub = anyInv.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;
  if (parentSub && typeof parentSub === "object") return parentSub.id;
  const lineSub = anyInv.lines?.data?.find((l) => l.parent?.subscription_item_details?.subscription)
    ?.parent?.subscription_item_details?.subscription;
  return lineSub;
}

async function handleStripeEvent(event: import("stripe").Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const reference = session.metadata?.reference || session.client_reference_id || undefined;
      if (!reference) break;
      const booking = await storage.getBookingByReference(reference);
      if (!booking) break;

      // Mark the one-time/deposit payment PAID (matched by session id stored as stripeRef).
      const payment = await storage.getPaymentByStripeRef(session.id);
      if (payment) {
        await storage.updatePayment(payment.id, { status: "PAID", paidAt: new Date() });
      }

      // Confirm booking; co-living becomes ACTIVE and the room is occupied.
      await storage.updateBooking(booking.id, {
        status: booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED",
      });
      if (booking.roomId) await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });

      // If this checkout also created a subscription (co-living weekly), record it.
      if (session.mode === "subscription" && session.subscription) {
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const existing = await storage.getSubscriptionByStripeId(subId);
        if (!existing) {
          const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
          await storage.createSubscription({
            bookingId: booking.id,
            stripeSubscriptionId: subId,
            weeklyAmount: room ? room.weeklyRent : "0",
            status: "active",
            nextChargeAt: null,
          });
        }
      }
      const confirmedGuest = await storage.getGuest(booking.guestId);
      if (confirmedGuest) {
        posthog.capture({
          distinctId: confirmedGuest.email,
          event: "booking_confirmed",
          properties: {
            reference,
            booking_id: booking.id,
            property_id: booking.propertyId,
            property_type: booking.model,
            room_id: booking.roomId ?? null,
            check_in: booking.checkIn,
            check_out: booking.checkOut,
          },
        });
        // Guest confirmation + admin alert (idempotent on the booking, so a
        // Stripe webhook retry can't double-send).
        const confirmedProperty = await storage.getProperty(booking.propertyId);
        const confirmedRoom = booking.roomId ? await storage.getRoom(booking.roomId) : null;
        if (confirmedProperty) {
          await onBookingConfirmed({
            booking: {
              ...booking,
              status: booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED",
            },
            property: confirmedProperty,
            room: confirmedRoom,
            guest: confirmedGuest,
          });
        }
      }
      log(`booking ${reference} confirmed via checkout.session.completed`, "stripe");
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as import("stripe").Stripe.Invoice;
      const subId = subIdFromInvoice(invoice);
      if (!subId) break;
      const sub = await storage.getSubscriptionByStripeId(subId);
      if (!sub) break;
      // Record the weekly rent payment.
      await storage.createPayment({
        bookingId: sub.bookingId,
        type: "WEEKLY",
        method: "STRIPE",
        amount: String((invoice.amount_paid ?? 0) / 100),
        surcharge: "0",
        status: "PAID",
        stripeRef: invoice.id ?? null,
        confirmedBy: null,
        paidAt: new Date(),
      });
      await storage.updateSubscription(sub.id, { status: "active" });
      log(`weekly invoice paid for subscription ${subId}`, "stripe");
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as import("stripe").Stripe.Invoice;
      const subId = subIdFromInvoice(invoice);
      if (!subId) break;
      const sub = await storage.getSubscriptionByStripeId(subId);
      if (sub) await storage.updateSubscription(sub.id, { status: "past_due" });
      log(`weekly invoice FAILED for subscription ${subId}`, "stripe");
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const local = await storage.getSubscriptionByStripeId(sub.id);
      if (local) await storage.updateSubscription(local.id, { status: sub.status });
      break;
    }

    // --- Phase 4: co-living lease PaymentIntents (saved-card model) ---
    case "payment_intent.succeeded": {
      const pi = event.data.object as import("stripe").Stripe.PaymentIntent;
      const kind = pi.metadata?.payment_kind;
      const hasLease = pi.metadata?.lease_id && pi.metadata.lease_id !== "null";
      if (kind === "BOOKING_DEPOSIT" && !hasLease) {
        // Short-stay one-time payment (STR whole-property, or a short 7–28-night
        // co-living reservation), payment-first: NO booking row existed before
        // now. MATERIALIZE the booking from the PI metadata. Idempotent across
        // Stripe retries (keyed on `reference`); re-checks availability so a rare
        // concurrent double-book is refunded instead of overbooking.
        await materializeShortStayBooking(pi);
      } else if (kind === "BOOKING_DEPOSIT" && hasLease) {
        // Co-living deposit succeeded → secure the room(s) + charge first week.
        await finalizeDepositPayment(pi.id);
        const depositedLease = await storage.getLease(pi.metadata.lease_id);
        if (depositedLease) {
          const depositedGuest = await storage.getGuest(depositedLease.guestId);
          if (depositedGuest) {
            posthog.capture({
              distinctId: depositedGuest.email,
              event: "lease_activated",
              properties: {
                lease_id: depositedLease.id,
                property_id: depositedLease.propertyId,
                payment_intent_id: pi.id,
                amount: pi.amount / 100,
              },
            });
          }
        }
      } else if (kind === "FIRST_PAYMENT") {
        // Source of truth for lease activation.
        await finalizeFirstPayment(pi.id);
      } else if (kind === "CLEANING_FEE") {
        // One-time non-refundable cleaning fee (charged off-session at move-in).
        // Mark it PAID on the lease. Idempotent by (lease_id, matching PI). The
        // charge was fired from finalizeDepositPayment; this is the confirm.
        const leaseId = pi.metadata?.lease_id;
        if (leaseId && leaseId !== "null") {
          const feeLease = await storage.getLease(leaseId);
          if (feeLease && feeLease.cleaningFeeStatus !== "PAID") {
            await storage.updateLease(leaseId, {
              cleaningFeeStatus: "PAID",
              cleaningFeePaidAt: new Date(),
              cleaningFeeStripePaymentIntentId: pi.id,
            });
          }
        }
      } else if (kind === "SCHEDULED_RENT") {
        // Settle the installment by (lease_id, schedule_seq) from metadata. The
        // sweep usually already marked it PAID; this is the authoritative confirm
        // and covers the requires_action → succeeded async case. Idempotent.
        const leaseId = pi.metadata?.lease_id;
        const seq = parseInt(pi.metadata?.schedule_seq ?? "", 10);
        if (leaseId && Number.isFinite(seq)) {
          const rows = await storage.getScheduleByLease(leaseId);
          const row = rows.find((r) => r.scheduleSeq === seq);
          if (row && row.status !== "PAID") {
            await storage.updateScheduleRow(row.id, {
              status: "PAID",
              paidAt: new Date(),
              stripePaymentIntentId: pi.id,
            });
            // Bill any accrued late fees for this installment as a separate charge.
            const lease = await storage.getLease(leaseId);
            const property = lease ? await storage.getProperty(lease.propertyId) : null;
            if (lease && property) {
              const leaseRooms = await storage.getLeaseRooms(lease.id);
              try {
                await billAccruedLateFees({ lease, property, rooms: leaseRooms, scheduleSeq: seq });
              } catch (feeErr) {
                log(`webhook late-fee billing failed ${leaseId} seq ${seq}: ${(feeErr as Error).message}`, "stripe");
              }
            }
            if (lease) {
              const rentGuest = await storage.getGuest(lease.guestId);
              if (rentGuest) {
                posthog.capture({
                  distinctId: rentGuest.email,
                  event: "scheduled_rent_paid",
                  properties: {
                    lease_id: leaseId,
                    schedule_seq: seq,
                    amount: pi.amount / 100,
                    payment_intent_id: pi.id,
                  },
                });
              }
            }
          }
        }
      }
      log(`payment_intent.succeeded (${kind ?? "untagged"}) ${pi.id}`, "stripe");
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as import("stripe").Stripe.PaymentIntent;
      const kind = pi.metadata?.payment_kind;
      // Did the dunning path actually take ownership of this decline? Only then
      // does it own the operator alert; every other route out of the block below
      // (malformed metadata, unresolved lease/guest, an already PAID/WAIVED row,
      // or handleChargeFailure itself throwing) must still page a human.
      let dunningHandled = false;
      if (kind === "SCHEDULED_RENT") {
        const leaseId = pi.metadata?.lease_id;
        const seq = parseInt(pi.metadata?.schedule_seq ?? "", 10);
        if (leaseId && Number.isFinite(seq)) {
          const rows = await storage.getScheduleByLease(leaseId);
          const row = rows.find((r) => r.scheduleSeq === seq);
          // Don't clobber a PAID row; mark a still-open one FAILED + run dunning.
          if (row && row.status !== "PAID" && row.status !== "WAIVED") {
            const failed = (await storage.updateScheduleRow(row.id, { status: "FAILED", stripePaymentIntentId: pi.id })) ?? row;
            const lease = await storage.getLease(leaseId);
            const guest = lease ? await storage.getGuest(lease.guestId) : null;
            if (lease && guest) {
              posthog.capture({
                distinctId: guest.email,
                event: "payment_failed",
                properties: {
                  lease_id: leaseId,
                  schedule_seq: seq,
                  amount: pi.amount / 100,
                  failure_reason: pi.last_payment_error?.message ?? null,
                  payment_intent_id: pi.id,
                },
              });
              try {
                await handleChargeFailure({ lease, guest, scheduleRow: failed, reason: pi.last_payment_error?.message });
                dunningHandled = true;
              } catch (dErr) {
                log(`webhook failure-path error ${leaseId} seq ${seq}: ${(dErr as Error).message}`, "stripe");
              }
            }
          }
        }
      }
      // Operator alert — a fallback, not a duplicate. When handleChargeFailure ran
      // it has already paged with full lease/guest context, so paging again would
      // just train operators to ignore the channel. When it did NOT run, this is
      // the only notice a human gets, so it must fire. No guest contact details:
      // this path may not have resolved a guest at all.
      if (!dunningHandled) {
        await notifyAdmin({
          subject: `Card charge FAILED — ${kind ?? "untagged"} ($${(pi.amount / 100).toFixed(2)})`,
          body:
            `PaymentIntent ${pi.id} (${kind ?? "untagged"}) failed` +
            `${pi.metadata?.lease_id && pi.metadata.lease_id !== "null" ? ` for lease ${pi.metadata.lease_id}` : ""}` +
            `${pi.metadata?.schedule_seq ? ` installment #${pi.metadata.schedule_seq}` : ""}: ` +
            `${pi.last_payment_error?.message ?? "no reason given"}.`,
          context: {
            leaseId:
              pi.metadata?.lease_id && pi.metadata.lease_id !== "null" ? pi.metadata.lease_id : null,
            kind: "PAYMENT_FAILED",
          },
        });
      }
      log(`payment_intent.payment_failed (${kind ?? "untagged"}) ${pi.id}`, "stripe");
      break;
    }

    default:
      break;
  }
}
