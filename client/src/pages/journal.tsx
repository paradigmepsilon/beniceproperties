// client/src/pages/journal.tsx  (/journal)
// The journal index — a grid of post cards over JOURNAL_POSTS (newest first).
// Owned content; no third-party service. Empty list shows a gentle placeholder.

import { SiteHeader, SiteFooter } from "@/components/site-header";
import { JournalCard } from "@/components/journal-card";
import { JOURNAL_POSTS } from "@/content/journal";
import { useSeo } from "@/lib/seo";

export default function Journal() {
  useSeo({
    title: "Journal",
    description:
      "Notes from the homes: booking direct, what's included, and making the most of a stay, straight from the people who run the places.",
    path: "/journal",
  });

  // Newest first by ISO date (string compare is correct for YYYY-MM-DD).
  const posts = [...JOURNAL_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-foreground">Journal</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Notes from the homes
        </h1>
        <p className="mt-2 max-w-[52ch] text-muted-foreground">
          Booking direct, what's included, and making the most of a stay, straight from the people
          who run the places.
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 text-muted-foreground">New posts are on the way.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <JournalCard key={p.slug} post={p} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
