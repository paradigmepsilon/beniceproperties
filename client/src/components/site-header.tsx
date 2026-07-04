import { useEffect, useState } from "react";
import { Link } from "wouter";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

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
        {/* BT-23 mobile: min-h-11 on each link so nav items are 44px tap targets. */}
        <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground sm:gap-6">
          {/* Plain anchor: wouter Link doesn't scroll to hashes; a real
              navigation to /#stays lands on home and scrolls to the listings. */}
          <a href="/#stays" className="inline-flex min-h-11 items-center transition-colors hover:text-foreground">
            Browse stays
          </a>
          {/* Plain anchor: wouter Link doesn't scroll to hashes; a real
              navigation to /#how lands and scrolls natively. */}
          <a href="/#how" className="hidden min-h-11 items-center transition-colors hover:text-foreground sm:inline-flex">
            How it works
          </a>
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

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-foreground text-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <div className="flex items-center gap-3">
              <img src="/bnp-mark-round.png" alt="Be Nice Properties" className="h-10 w-10" />
              <span className="font-display text-lg font-semibold">Be Nice Properties</span>
            </div>
            <p className="mt-3 text-sm text-white/60">
              Whole-home stays and by-the-room co-living in Atlanta, Antigua, and beyond. Book
              direct, stay comfortable.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-14 gap-y-8">
            <FooterCol title="Stays">
              {/* Plain anchors on purpose: these deep-link into home filters
                  (/?type=…#stays) and need a real navigation to apply. */}
              <a href="/#stays">Browse all</a>
              <a href="/?type=STR#stays">Whole properties</a>
              <a href="/?type=COLIVING#stays">Rooms</a>
              <a href="/?city=Atlanta#stays">Atlanta</a>
              <a href={`/?city=${encodeURIComponent("St. John's")}#stays`}>St. John&rsquo;s</a>
            </FooterCol>
            <FooterCol title="Company">
              <a href="/#how">How it works</a>
            </FooterCol>
            <FooterCol title="Support">
              <a href="/lookup">My booking</a>
            </FooterCol>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/50">
          <span>© {new Date().getFullYear()} Be Nice Properties.</span>
          <span>Atlanta · Antigua</span>
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
