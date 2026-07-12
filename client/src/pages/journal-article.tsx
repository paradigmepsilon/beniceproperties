// client/src/pages/journal-article.tsx  (/journal/:slug)
// A single journal post, fetched from /api/journal/:slug (published posts only —
// an unknown or unpublished slug 404s → the site's NotFound treatment). Block
// rendering mirrors the "render what's present" convention: headings via
// font-display, paragraphs via <RichText> (plain text, no markdown, no
// dangerouslySetInnerHTML), images via <ListingImage> (graceful fallback).

import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { RichText } from "@/components/rich-text";
import { ListingImage } from "@/components/listing-image";
import type { JournalArticle } from "@/content/journal";
import { shortDate } from "@/lib/format";
import { useSeo, SITE_URL, SITE_NAME } from "@/lib/seo";
import NotFound from "@/pages/not-found";

export default function JournalArticle() {
  const { slug } = useParams();

  // Published-only fetch; a 404 (draft/unknown) rejects → we render NotFound.
  // retry:false so a genuine 404 doesn't retry. gcTime default is fine.
  const {
    data: post,
    isLoading,
    isError,
  } = useQuery<JournalArticle>({
    queryKey: ["/api/journal", slug],
    enabled: !!slug,
    retry: false,
  });

  // useSeo must run unconditionally (rules of hooks), so build a safe input
  // whether or not the slug resolves to a real post.
  useSeo({
    title: post ? post.title : "Journal",
    description: post?.excerpt ?? "Notes from the homes at Be Nice Properties.",
    path: `/journal/${slug ?? ""}`,
    type: "article",
    // Cover doubles as the social-share image when the post has one.
    image: post?.cover,
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          url: `${SITE_URL}/journal/${post.slug}`,
          mainEntityOfPage: `${SITE_URL}/journal/${post.slug}`,
          ...(post.cover ? { image: post.cover } : {}),
          author: { "@type": "Organization", name: SITE_NAME },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
        }
      : undefined,
  });

  // While loading, keep the chrome so there's no flash of 404.
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
          <p className="text-muted-foreground">Loading…</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Unknown/unpublished slug (or fetch error) → reuse the site's 404 page.
  if (isError || !post) return <NotFound />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <Link
          href="/journal"
          className="bnp-pill mb-5 gap-1.5 border-primary bg-accent font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
          data-testid="link-back-journal"
        >
          <ArrowLeft className="h-4 w-4" /> Journal
        </Link>

        <article>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {shortDate(post.date)}
          </span>
          <h1 className="mt-1.5 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>

          {/* Cover: reuse the image primitive so a missing cover still looks
              intentional (deterministic gradient keyed on the slug). */}
          <div className="relative mt-6 aspect-[3/2] w-full overflow-hidden rounded-3xl">
            <ListingImage
              id={post.slug}
              photos={post.cover ? [post.cover] : null}
              alt={post.title}
              kind="STR"
              rounded="rounded-none"
            />
          </div>

          <div className="mt-8">
            {post.blocks.map((block, i) => {
              if (block.type === "heading") {
                return (
                  <h2
                    key={i}
                    className="mt-8 font-display text-2xl font-semibold tracking-tight text-foreground first:mt-0"
                  >
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "image") {
                return (
                  <div
                    key={i}
                    className="relative mt-6 aspect-[3/2] w-full overflow-hidden rounded-2xl"
                  >
                    <ListingImage
                      id={`${post.slug}-${i}`}
                      photos={block.src ? [block.src] : null}
                      alt={block.alt}
                      kind="STR"
                      rounded="rounded-none"
                    />
                  </div>
                );
              }
              // paragraph
              return <RichText key={i} text={block.text} className="mt-4" />;
            })}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
