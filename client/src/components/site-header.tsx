import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Instagram, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { COMPANY } from "@/content/company";

// Shared nav-link classes. The active page gets a permanent foreground color plus
// a subtle underline bar (an ::after pseudo-element, so it adds no layout shift);
// inactive links stay muted and reveal the color on hover, as before.
const NAV_LINK_BASE =
  "relative inline-flex min-h-11 items-center transition-colors hover:text-foreground after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform";
const NAV_LINK_ACTIVE = "text-foreground after:scale-x-100";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b bg-[#FBFAF7]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center">
          <img
            src={scrolled ? "/bnp-mark-round.png" : "/bnp-logo.png"}
            alt="Be Nice Properties"
            className={
              scrolled
                ? "h-[3.125rem] w-[3.125rem] transition-all duration-300"
                : "h-[3.125rem] w-auto transition-all duration-300"
            }
          />
        </Link>
        {/* BT-23 mobile: min-h-11 on each link so nav items are 44px tap targets.
            The three product links lead; content links demote below sm. */}
        <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground sm:gap-6">
          {/* Co-living is the home page; a real /#stays navigation scrolls to the
              rooms grid (wouter Link doesn't scroll to hashes). Active on "/". */}
          <a
            href="/#stays"
            className={cn(NAV_LINK_BASE, location === "/" && NAV_LINK_ACTIVE)}
          >
            Co-living
          </a>
          {/* Secondary content items hidden on the smallest screens to keep the
              mobile header uncrowded. */}
          <Link
            href="/community"
            className={cn(NAV_LINK_BASE, "hidden sm:inline-flex", location === "/community" && NAV_LINK_ACTIVE)}
          >
            Community
          </Link>
          <Link
            href="/journal"
            className={cn(NAV_LINK_BASE, "hidden md:inline-flex", location.startsWith("/journal") && NAV_LINK_ACTIVE)}
          >
            Journal
          </Link>
          {/* Partner: B2B page. Demoted below md like Journal to keep the mobile
              header uncrowded; on small screens it's reachable from the footer
              Company group (this header has no separate mobile menu). */}
          <Link
            href="/partner"
            className={cn(NAV_LINK_BASE, "hidden md:inline-flex", location === "/partner" && NAV_LINK_ACTIVE)}
          >
            Partner
          </Link>
          {/* Properties: STR + LTR consolidated into one dropdown. */}
          <PropertiesMenu active={location === "/str" || location === "/ltr"} />
          <Link
            href="/lookup"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-accent-foreground"
          >
            My booking
          </Link>
        </nav>
      </div>
    </header>
  );
}

// "Properties" nav item: a click-to-open dropdown consolidating the two
// whole-home products (Short-term → /str, Long-term → /ltr). Closes on outside
// click or Escape; keyboard-accessible (aria-expanded + focusable menu links).
// `active` marks the trigger when the current page is /str or /ltr.
function PropertiesMenu({ active = false }: { active?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex min-h-11 items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
        data-testid="nav-properties"
      >
        {/* Underline the label only (not the chevron) so the active bar matches
            the other nav links. */}
        <span
          className={cn(
            "relative after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:bg-current after:transition-transform",
            active ? "after:scale-x-100" : "after:scale-x-0",
          )}
        >
          Properties
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border bg-card py-1 shadow-card"
        >
          <Link
            href="/str"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-2 px-4 text-sm text-foreground transition-colors hover:bg-secondary"
            data-testid="nav-properties-str"
          >
            <span aria-hidden className="h-2 w-2 rounded-full bg-segment-whole" />
            Short-term
          </Link>
          <Link
            href="/ltr"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-2 px-4 text-sm text-foreground transition-colors hover:bg-secondary"
            data-testid="nav-properties-ltr"
          >
            <span aria-hidden className="h-2 w-2 rounded-full bg-segment-ltr" />
            Long-term
          </Link>
        </div>
      )}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-foreground text-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        {/* Owned email capture — reduces platform dependency by building a direct
            audience. Centered band at the top of the footer, above the nav. */}
        <div className="mb-12 border-b border-white/15 pb-12">
          <NewsletterSignup centered />
        </div>

        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <div className="flex items-center gap-3">
              <img src="/bnp-mark-round.png" alt="Be Nice Properties" className="h-10 w-10" />
              <span className="font-display text-lg font-semibold">Be Nice Properties</span>
            </div>
            <p className="mt-3 text-sm text-white/60">
              Co-living rooms, short-term getaways, and long-term homes in Atlanta, and
              beyond. Book direct, Be Nice.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-x-14 gap-y-8 md:flex-nowrap">
            <FooterCol title="Stays">
              {/* Each product now has its own page. Plain anchors so a real
                  navigation lands (and /#stays scrolls to the co-living grid). */}
              <a href="/#stays">Co-living rooms</a>
              <a href="/str">Short-term rentals</a>
              <a href="/ltr">Long-term rentals</a>
            </FooterCol>
            <FooterCol title="Company">
              <a href="/about">About us</a>
              <a href="/community">Community</a>
              <a href="/partner">Partner with us</a>
              <a href="/journal">Journal</a>
              <a href="/#how">How it works</a>
            </FooterCol>
            <FooterCol title="Support">
              <a href="/lookup">My booking</a>
            </FooterCol>
            <FooterCol title="Affiliates">
              {/* Sister brands in the Be Nice family. External sites, so plain
                  anchors that open in a new tab. */}
              <a href="https://benicehospitality.com" target="_blank" rel="noopener noreferrer">
                Be Nice Hospitality
              </a>
              <a href="https://beniceautos.com" target="_blank" rel="noopener noreferrer">
                Be Nice Autos
              </a>
              <a href="https://theretreatatdouglasville.com" target="_blank" rel="noopener noreferrer">
                The Retreat at Douglasville
              </a>
            </FooterCol>
          </div>
        </div>

        <FooterSocial />

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/50">
          <span>© {new Date().getFullYear()} Be Nice Properties.</span>
          <span>U.S. · Antigua</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  // BT-23 mobile: each footer link is a 44px-tall tap target (flex + min-h-11).
  return (
    <div className="flex min-w-[140px] flex-col text-sm [&>a:hover]:text-white [&>a]:flex [&>a]:min-h-11 [&>a]:items-center [&>a]:text-white/70">
      <h4 className="text-xs font-bold uppercase tracking-wider text-white/90">{title}</h4>
      {children}
    </div>
  );
}

// Social icon row — plain links to the brand's profiles from company.ts. Each
// entry hides itself if its handle is undefined. No live embed / external
// script, consistent with FollowStrip.
const FOOTER_SOCIAL = [
  { key: "instagram", href: COMPANY.social.instagram, label: "Instagram", Icon: Instagram },
  { key: "facebook", href: COMPANY.social.facebook, label: "Facebook", Icon: Facebook },
  { key: "tiktok", href: COMPANY.social.tiktok, label: "TikTok", Icon: TikTokIcon },
] as const;

function FooterSocial() {
  const active = FOOTER_SOCIAL.filter((s) => Boolean(s.href));
  if (active.length === 0) return null;
  return (
    <div className="mt-12 flex gap-3">
      {active.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-white/40 hover:text-white"
          data-testid={`footer-social-${key}`}
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}

// lucide-react has no TikTok glyph, so this is a minimal inline SVG matching the
// lucide sizing convention (currentColor, 24x24 viewBox, className passthrough).
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16.5 3a5.6 5.6 0 0 0 4.5 4.5v3a8.4 8.4 0 0 1-4.5-1.32V15a6 6 0 1 1-6-6c.34 0 .67.03 1 .09v3.09a3 3 0 1 0 2 2.82V3h3z" />
    </svg>
  );
}
