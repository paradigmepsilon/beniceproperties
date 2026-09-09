import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Instagram, Facebook, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { COMPANY } from "@/content/company";
import { useSiteConfig } from "@/lib/useSiteConfig";

// Shared nav-link classes. The active page gets a permanent foreground color plus
// a subtle underline bar (an ::after pseudo-element, so it adds no layout shift);
// inactive links stay muted and reveal the color on hover, as before.
const NAV_LINK_BASE =
  "relative inline-flex min-h-11 items-center transition-colors hover:text-foreground after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform";
const NAV_LINK_ACTIVE = "text-foreground after:scale-x-100";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  // UO-controlled page visibility. Hidden pages drop out of the nav (they still
  // resolve to a "Coming soon" placeholder if reached by direct URL).
  const { config } = useSiteConfig();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation, so tapping a destination doesn't leave
  // the panel covering the page it just loaded.
  useEffect(() => setMenuOpen(false), [location]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b bg-[#FBFAF7]/85 backdrop-blur-md">
      {/* gap-4 guarantees the logo and nav can never collide: at 390px the mark
          previously ended at x=114 and the nav began at x=114 with zero gap. */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="flex shrink-0 items-center">
          <img
            src={scrolled ? "/bnp-mark-round.png" : "/bnp-logo.png"}
            alt="Be Nice Properties"
            className={cn(
              "transition-all duration-300",
              // Capped at 36px on mobile; the full 50px mark only from md up.
              scrolled ? "h-9 w-9 md:h-[3.125rem] md:w-[3.125rem]" : "h-9 w-auto md:h-[3.125rem]",
            )}
          />
        </Link>

        {/* Desktop nav. Every destination is visible from md up; below that the
            hamburger owns navigation, so nothing is unreachable on a phone. */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {/* Co-living is the home page; a real /#stays navigation scrolls to the
              rooms grid (wouter Link doesn't scroll to hashes). Active on "/". */}
          <a
            href="/#stays"
            className={cn(NAV_LINK_BASE, location === "/" && NAV_LINK_ACTIVE)}
          >
            Co-living
          </a>
          <Link
            href="/community"
            className={cn(NAV_LINK_BASE, location === "/community" && NAV_LINK_ACTIVE)}
          >
            Community
          </Link>
          {config.pages.journal && (
            <Link
              href="/journal"
              className={cn(NAV_LINK_BASE, location.startsWith("/journal") && NAV_LINK_ACTIVE)}
            >
              Journal
            </Link>
          )}
          <Link
            href="/partner"
            className={cn(NAV_LINK_BASE, location === "/partner" && NAV_LINK_ACTIVE)}
          >
            Partner
          </Link>
          {/* Properties: STR + LTR consolidated into one dropdown. LTR item is
              hidden when its page is toggled off from UO. */}
          <PropertiesMenu
            active={location === "/str" || location === "/ltr"}
            showLtr={config.pages.ltr}
          />
          <Link
            href="/lookup"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-[#b23a28]"
          >
            My booking
          </Link>
        </nav>

        {/* Mobile: one-word CTA (the old "My booking" wrapped to two lines at
            390px) plus the menu toggle. */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/lookup"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Book
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-foreground transition-colors hover:bg-secondary"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile panel. Carries every destination the desktop nav has — the
          previous header hid Community, Journal, Partner and About below md with
          no menu at all, making four pages unreachable from a phone. */}
      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t bg-[#FBFAF7] px-6 py-2 text-sm font-medium md:hidden"
        >
          <MobileNavLink href="/#stays" plain>Co-living rooms</MobileNavLink>
          <MobileNavLink href="/str">Short-term rentals</MobileNavLink>
          {config.pages.ltr && <MobileNavLink href="/ltr">Long-term rentals</MobileNavLink>}
          <MobileNavLink href="/community">Community</MobileNavLink>
          {config.pages.journal && <MobileNavLink href="/journal">Journal</MobileNavLink>}
          <MobileNavLink href="/partner">Partner with us</MobileNavLink>
          <MobileNavLink href="/about">About us</MobileNavLink>
          <MobileNavLink href="/lookup">My booking</MobileNavLink>
        </nav>
      )}
    </header>
  );
}

// One row of the mobile menu. 48px tall so every target clears the 44px floor
// with room to spare. `plain` uses a real anchor for the /#stays hash, which
// wouter's Link does not scroll to.
function MobileNavLink({
  href,
  children,
  plain = false,
}: {
  href: string;
  children: React.ReactNode;
  plain?: boolean;
}) {
  const cls =
    "flex min-h-12 items-center border-b border-border/60 text-foreground last:border-b-0";
  return plain ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

// "Properties" nav item: a click-to-open dropdown consolidating the two
// whole-home products (Short-term → /str, Long-term → /ltr). Closes on outside
// click or Escape; keyboard-accessible (aria-expanded + focusable menu links).
// `active` marks the trigger when the current page is /str or /ltr. `showLtr`
// hides the Long-term item when that page is toggled off from UO.
function PropertiesMenu({ active = false, showLtr = true }: { active?: boolean; showLtr?: boolean }) {
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
          {showLtr && (
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
          )}
        </div>
      )}
    </div>
  );
}

export function SiteFooter() {
  // Same UO-controlled visibility as the header: hidden pages drop their footer
  // links too, so a toggled-off page isn't advertised anywhere in the chrome.
  const { config } = useSiteConfig();
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
          {/* Grid, not flex. The previous `flex-wrap ... md:flex-nowrap` turned
              wrapping OFF at exactly the width where it was needed: four
              min-w-[140px] columns plus gap-x-14 forced an 896px content floor,
              so from 768px to ~896px the Affiliates column rendered outside the
              viewport. Because `body` sets `overflow-x: hidden`, it was clipped
              rather than scrollable — those links were unreachable on iPad
              portrait and small laptop windows. A grid reflows instead. */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4 md:gap-x-12">
            <FooterCol title="Stays">
              {/* Each product now has its own page. Plain anchors so a real
                  navigation lands (and /#stays scrolls to the co-living grid). */}
              <a href="/#stays">Co-living rooms</a>
              <a href="/str">Short-term rentals</a>
              {config.pages.ltr && <a href="/ltr">Long-term rentals</a>}
            </FooterCol>
            <FooterCol title="Company">
              <a href="/about">About us</a>
              <a href="/house-rules">House rules</a>
              <a href="/community">Community</a>
              <a href="/partner">Partner with us</a>
              {config.pages.journal && <a href="/journal">Journal</a>}
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
    <div className="flex flex-col text-sm [&>a:hover]:text-white [&>a]:flex [&>a]:min-h-11 [&>a]:items-center [&>a]:text-white/70">
      {/* h3, not h4: the newsletter block above the footer is an h2, so h4 here
          skipped a level on every page. */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-white/90">{title}</h3>
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
