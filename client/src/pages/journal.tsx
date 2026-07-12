// client/src/pages/journal.tsx  (/journal)
// The journal index — a grid of post cards fetched from /api/journal (published
// posts only, newest first, served by Unified Ops-authored content). Owned
// content; no third-party service. Empty list shows a gentle placeholder.

import { useQuery } from "@tanstack/react-query";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { JournalCard } from "@/components/journal-card";
import type { JournalPost } from "@/content/journal";
import { useSeo, SITE_URL, SITE_NAME } from "@/lib/seo";

export default function Journal() {
  // The API already returns published posts newest-first.
  const { data: posts = [], isLoading } = useQuery<JournalPost[]>({
    queryKey: ["/api/journal"],
  });

  useSeo({
    title: "Journal",
    description:
      "Notes from the homes: booking direct, what's included, and making the most of a stay, straight from the people who run the places.",
    path: "/journal",
    // Blog node listing the published posts so crawlers see the whole index
    // without visiting each article first.
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: `${SITE_NAME} Journal`,
      url: `${SITE_URL}/journal`,
      blogPost: posts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: `${SITE_URL}/journal/${p.slug}`,
        datePublished: p.date,
      })),
    },
  });

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

        {isLoading ? (
          <p className="mt-12 text-muted-foreground">Loading…</p>
        ) : posts.length === 0 ? (
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
