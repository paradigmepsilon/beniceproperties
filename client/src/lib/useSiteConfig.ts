// client/src/lib/useSiteConfig.ts
// Reads the public site configuration (feature/visibility flags) the server
// exposes at /api/site-config. Managed from Unified-Ops. Drives which optional
// pages (LTR, Journal) are live: their nav/footer links and whether the route
// renders the real page or a "Coming soon" placeholder.
//
// Fail-open: while loading, on error, or on a stale/absent flag, pages default
// to VISIBLE. Hiding a page is an intentional admin action; a transient config
// fetch failure should never blank out live content that's meant to be up.

import { useQuery } from "@tanstack/react-query";

export interface SiteConfig {
  pages: {
    ltr: boolean;
    journal: boolean;
  };
}

const DEFAULT_CONFIG: SiteConfig = {
  pages: { ltr: true, journal: true },
};

export function useSiteConfig(): { config: SiteConfig; isLoading: boolean } {
  const { data, isLoading } = useQuery<SiteConfig>({
    queryKey: ["/api/site-config"],
    // Config rarely changes; a short-lived cache is fine and keeps navigation snappy.
    staleTime: 60 * 1000,
  });

  // Merge over defaults so a partial/missing payload still yields booleans and
  // an as-yet-unloaded config renders pages as visible (fail-open).
  const config: SiteConfig = {
    pages: {
      ltr: data?.pages?.ltr ?? DEFAULT_CONFIG.pages.ltr,
      journal: data?.pages?.journal ?? DEFAULT_CONFIG.pages.journal,
    },
  };

  return { config, isLoading };
}
