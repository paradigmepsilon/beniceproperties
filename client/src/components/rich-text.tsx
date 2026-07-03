import { cn } from "@/lib/utils";

/**
 * RichText (BT-21) — renders a long-form, plain-text description with its
 * paragraph structure preserved. Property/room descriptions are authored in
 * Unified Ops as plain text with line breaks; rendering them in a single <p>
 * collapses every newline to a space and produces one run-on block. This splits
 * on blank lines into separate <p> paragraphs, and keeps single newlines inside
 * a paragraph as soft line breaks.
 *
 * No markdown parsing (descriptions are plain text) and no dangerouslySetInnerHTML
 * — text is rendered as text, so it's safe against injection.
 *
 * Renders nothing when the text is null/empty, so callers can drop it in without
 * guarding the empty state themselves (AC#3).
 */
export function RichText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  // Split into paragraphs on one-or-more blank lines (handling \r\n too).
  const paragraphs = trimmed
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={cn("space-y-4 leading-relaxed text-foreground/90", className)}>
      {paragraphs.map((para, i) => {
        const lines = para.split("\n");
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
