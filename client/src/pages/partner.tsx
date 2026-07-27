// client/src/pages/partner.tsx  (/partner)
// B2B partner page — the one place people come to work WITH Be Nice Properties
// rather than book a stay: invest in acquisitions, hand us a property to manage,
// have us design/furnish it, curate events, or build community there. Modeled on
// livingq.city/partnerships, in BNP's voice and the site's theming.
//
// Layout (per the brief): hero → the "Start a conversation" form up top → then the
// five services as alternating image/text editorial rows (shared EditorialRow,
// keyed to the emerald partner accent). Each row's CTA pre-selects its matching
// interest chip in the form above and scrolls back up. Lead-funnel only.
//
// Partner accent — deep emerald (#2f5d50) → slate (#1c3a33). B2B/premium, and
// deliberately unlike the co-living teal / STR coral / LTR amber segment colors.

import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PageHero, HeroCta } from "@/components/page-hero";
import { EditorialRow } from "@/components/editorial-row";
import { Button } from "@/components/ui/button";
import {
  PartnerInquiryForm,
  preselectPartnerInterest,
} from "@/components/partner-inquiry-form";
import { useSeo, PARTNER_JSON_LD } from "@/lib/seo";

const PARTNER_GRADIENT = "linear-gradient(135deg, #2f5d50, #1c3a33)";

// One label for one action. All five offers post to the same form and differ
// only by the interest chip they pre-select, but the page shipped five distinct
// CTA labels ("Talk about investing", "Hand us the keys", …) and then the form
// renamed all five again in its own chips. The `cta` field on SERVICES is now
// unused for rendering and kept only as editorial reference copy.
const PARTNER_CTA = "Start a conversation";

// The five ways to partner, as editorial rows. `interest` maps to a
// PartnerInquiryForm chip value so a row's CTA can pre-select it. `imageRight`
// alternates down the page (first row image-right). Images are warm-editorial,
// literal-per-service (see /public/editorial/partner-*.jpg).
const SERVICES: {
  interest: string;
  eyebrow: string;
  heading: string;
  image: string;
  imageAlt: string;
  body: string;
  cta: string;
}[] = [
  {
    interest: "INVEST",
    eyebrow: "Invest",
    heading: "Invest alongside us",
    image: "/editorial/partner-invest.jpg",
    imageAlt: "An investor and a property owner reviewing plans and a house model together at a sunlit table.",
    body: "Put your capital into the properties we buy and run. We handle the deal and the day-to-day; you share in what it makes. You get the returns of owning a property without having to run one.",
    cta: "Talk about investing",
  },
  {
    interest: "MANAGE",
    eyebrow: "Manage",
    heading: "We'll manage your property",
    image: "/editorial/partner-manage.jpg",
    imageAlt: "A pristine, guest-ready short-term rental living room in soft natural light.",
    body: "We take the whole thing off your plate: the listing, the guests, pricing, cleaning, and maintenance. You own it, we run it like it's ours, and the money comes to you. Stay as hands-off or as involved as you like.",
    cta: "Hand us the keys",
  },
  {
    interest: "DESIGN",
    eyebrow: "Design",
    heading: "We'll design your property",
    image: "/editorial/partner-design.jpg",
    imageAlt: "A designer styling a freshly furnished boutique bedroom with warm textures and plants.",
    body: "An empty room doesn't book itself. We furnish and style it into a place people actually want to stay, right down to the small touches. It ends up looking great in photos and, more to the point, staying full.",
    cta: "Design my space",
  },
  {
    interest: "EVENTS",
    eyebrow: "Events",
    heading: "We'll curate events",
    image: "/editorial/partner-events.jpg",
    imageAlt: "An intimate string-lit evening gathering with a beautifully set table and happy guests.",
    body: "A good event turns a property into somewhere people want to be, and brings in money on top of the rent. Think date nights and dinners, the kind of evening guests tell their friends about and come back for.",
    cta: "Plan an event",
  },
  {
    interest: "COMMUNITY",
    eyebrow: "Community",
    heading: "We'll build community",
    image: "/editorial/partner-community.jpg",
    imageAlt: "A happy group of co-living housemates cooking and laughing together in a bright shared kitchen.",
    body: "When people feel at home somewhere, they stay. We build real community around a property so it stays full and people renew instead of moving on. These become homes folks are glad to live in, not just a place to sleep.",
    cta: "Build community",
  },
];

// Scroll up to the form and (optionally) pre-select an interest chip.
function goToForm(interest?: string) {
  if (interest) preselectPartnerInterest(interest);
  document.getElementById("partner-form")?.scrollIntoView({ behavior: "smooth" });
}

export default function Partner() {
  useSeo({
    title: "Partner With Be Nice Properties",
    description:
      "Invest, hand us a property to manage, have us design and furnish it, curate events, or build community. Start a conversation with Be Nice Properties.",
    path: "/partner",
    jsonLd: PARTNER_JSON_LD,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero — real partner art, emerald/slate accent (gradient falls through if
          the image is ever missing). */}
      <PageHero
        eyebrow="Partner with us"
        title="Own the property. We'll handle the rest."
        subtitle="Invest alongside us, hand us the keys, or let us design and fill it with life."
        cta={<HeroCta href="#partner-form">Start a conversation</HeroCta>}
        accent={PARTNER_GRADIENT}
        image="/heroes/partner.jpg"
        imageAlt="Exterior of a Be Nice managed property, the kind of home owners hand over to us to run"
      />

      <main className="flex-1">
        {/* Intro to the services — centered. Bottom padding gives the header room
            above the first divider below it. */}
        {/* Left-aligned, matching every other section header on the site. The
            centered variant here and on /about were the only two, and they read
            as imports from a different page. */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-10 pt-10">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Five ways to work with us
            </h2>
            <p className="mt-3 text-muted-foreground">
              Maybe you've got capital, maybe a property, maybe just an idea. However you're
              coming to us, there's a way in. Pick the one that fits and we'll take the first
              step together.
            </p>
          </div>
        </section>

        {/* First two offers as full editorial rows. The page previously ran all
            five through `imageRight={i % 2 === 0}`, producing five consecutive
            alternating image/text splits — the cap is two, and by row three a
            scanning reader has learned the pattern and stops reading. The
            remaining three move to a grid below, which also drops three of the
            page's seven eyebrows and all five ghost numerals. */}
        {SERVICES.slice(0, 2).map((s, i) => (
          <div key={s.interest}>
            <hr className="mx-auto w-full max-w-6xl border-t border-border" />
            <EditorialRow
              image={s.image}
              imageAlt={s.imageAlt}
              heading={s.heading}
              imageRight={i === 0}
              sectionClassName="px-6 py-10"
            >
              <p>{s.body}</p>
              <Button
                onClick={() => goToForm(s.interest)}
                data-testid={`button-service-${s.interest.toLowerCase()}`}
              >
                {PARTNER_CTA}
              </Button>
            </EditorialRow>
          </div>
        ))}

        {/* The other three offers as a card grid — a different layout family, so
            the page stops repeating itself. */}
        <hr className="mx-auto w-full max-w-6xl border-t border-border" />
        <section className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-6 md:grid-cols-3">
            {SERVICES.slice(2).map((s) => (
              <div key={s.interest} className="bnp-card flex flex-col overflow-hidden">
                <img
                  src={s.image}
                  alt={s.imageAlt}
                  loading="lazy"
                  width={640}
                  height={420}
                  className="h-44 w-full object-cover"
                />
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-xl font-semibold tracking-tight">{s.heading}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  <Button
                    className="mt-5 self-start"
                    onClick={() => goToForm(s.interest)}
                    data-testid={`button-service-${s.interest.toLowerCase()}`}
                  >
                    {PARTNER_CTA}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The conversion surface, now at the foot of the page. Every service
            row's CTA scrolls down here and pre-selects the matching interest. */}
        <section id="partner-form" className="border-t bg-card">
          <div className="mx-auto w-full max-w-2xl px-6 py-10">
            <PartnerInquiryForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
