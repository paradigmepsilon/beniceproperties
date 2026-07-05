// client/src/components/journal-card.tsx
// A journal post preview: cover + date + title + excerpt, linking to the
// article. Cover reuses <ListingImage> keyed on the slug, so a post without a
// cover shows a deterministic branded gradient instead of a broken image.

import { Link } from "wouter";
import type { JournalPost } from "@/content/journal";
import { ListingImage } from "@/components/listing-image";
import { shortDate } from "@/lib/format";

export function JournalCard({ post }: { post: JournalPost }) {
  return (
    <Link
      href={`/journal/${post.slug}`}
      className="bnp-card bnp-card-interactive group flex flex-col overflow-hidden"
      data-testid={`card-post-${post.slug}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <ListingImage
          id={post.slug}
          photos={post.cover ? [post.cover] : null}
          alt={post.title}
          kind="STR"
          rounded="rounded-none"
          className="transition-transform duration-300 group-hover:scale-[1.05]"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {shortDate(post.date)}
        </span>
        <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug tracking-tight">
          {post.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-snug text-muted-foreground">{post.excerpt}</p>
        <span className="mt-4 text-sm font-semibold text-primary">Read more →</span>
      </div>
    </Link>
  );
}
