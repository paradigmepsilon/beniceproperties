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
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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
        <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Browse
          </Link>
          <Link
            href="/lookup"
            className="rounded-full border px-4 py-1.5 transition-colors hover:bg-secondary hover:text-foreground"
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
    <footer className="mt-20 border-t bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <img src="/bnp-mark.png" alt="Be Nice Properties" className="h-10 w-10" />
          <div>
            <div className="font-display text-base font-semibold">Be Nice Properties</div>
            <p className="mt-1 text-sm text-muted-foreground">Stays in Atlanta &amp; Antigua.</p>
          </div>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Browse stays</Link>
          <Link href="/lookup" className="hover:text-foreground">My booking</Link>
        </div>
      </div>
    </footer>
  );
}
