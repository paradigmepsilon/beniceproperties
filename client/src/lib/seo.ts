// client/src/lib/seo.ts
// SEO constants + the useSeo hook. No third-party head manager: the hook writes
// <title>, meta, canonical, and JSON-LD directly into document.head via a
// useEffect. That keeps the bundle lean and, because the build-time prerender
// runs the real app in a headless browser, the prerendered HTML captures
// whatever this hook sets for each route.

import { useEffect } from "react";

// Canonical production origin. Used to build absolute canonical + og:url values.
// No trailing slash.
export const SITE_URL = "https://beniceproperties.vercel.app";
export const SITE_NAME = "Be Nice Properties";

// Default social share image (absolute URL). Falls back to the brand mark; swap
// for a wide branded OG image (1200x630) when one exists.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/bnp-mark-round.png`;

export interface SeoInput {
  /** Page title. The site name is appended automatically unless appendSiteName is false. */
  title: string;
  description: string;
  /** Path only, e.g. "/str". Combined with SITE_URL for canonical + og:url. */
  path: string;
  /** Absolute image URL for social cards. Defaults to the brand image. */
  image?: string;
  /** "website" (default) or "article" for journal posts. */
  type?: "website" | "article";
  /** Set false for the home page where the title already reads as the brand. */
  appendSiteName?: boolean;
  /** Optional JSON-LD object(s) injected as <script type="application/ld+json">. */
  jsonLd?: object | object[];
}

// Upsert a <meta> by name or property. Tags created here are tagged with
// data-seo so a route change can clean up the previous route's tags.
function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("data-seo", "");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    el.setAttribute("data-seo", "");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Remove JSON-LD blocks this hook previously added, then add the new ones.
function setJsonLd(data?: object | object[]) {
  document.head
    .querySelectorAll('script[data-seo-jsonld]')
    .forEach((n) => n.remove());
  if (!data) return;
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    const script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-seo-jsonld", "");
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  }
}

export function useSeo(input: SeoInput) {
  const {
    title,
    description,
    path,
    image = DEFAULT_OG_IMAGE,
    type = "website",
    appendSiteName = true,
    jsonLd,
  } = input;

  const fullTitle = appendSiteName ? `${title} | ${SITE_NAME}` : title;
  const url = `${SITE_URL}${path}`;

  useEffect(() => {
    document.title = fullTitle;
    setMeta("name", "description", description);
    setCanonical(url);

    // Open Graph
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", type);
    setMeta("property", "og:image", image);
    setMeta("property", "og:site_name", SITE_NAME);

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);

    setJsonLd(jsonLd);
  }, [fullTitle, description, url, image, type, jsonLd]);
}

// Sitewide Organization / LodgingBusiness node. Injected on the home page so it
// is present on the site's root URL.
export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  description:
    "Furnished co-living rooms, whole-home short-term rentals, and long-term homes in Atlanta and Antigua. Book direct.",
  url: SITE_URL,
  image: DEFAULT_OG_IMAGE,
  logo: DEFAULT_OG_IMAGE,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Douglasville",
    addressRegion: "GA",
    addressCountry: "US",
  },
  areaServed: ["Atlanta, GA", "Douglasville, GA", "St. John's, Antigua"],
  priceRange: "$$",
  knowsAbout: [
    "co-living",
    "furnished rooms",
    "short-term rentals",
    "vacation rentals",
    "long-term rentals",
  ],
};
