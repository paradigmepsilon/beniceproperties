// client/src/lib/portalFetch.ts
// Shared by the lease portal and the short-stay page. `cleanError` was already
// duplicated verbatim in portal.tsx and lease-sign.tsx; a third copy for the stay
// flow was the tipping point. Pure, so it is actually testable — vitest runs in a
// node environment here with no jsdom, so anything worth testing has to live
// outside JSX.

/**
 * Upload a single file field as multipart. Throws in the SAME `<status>: <body>`
 * shape apiRequest uses, so cleanError() can unwrap either one.
 */
export async function uploadFile(url: string, file: File): Promise<Response> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(url, { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

/**
 * Turn a thrown fetch error into something a guest should read.
 *
 * The server's 4xx messages are authored for guests, but they arrive wrapped as
 * `409: {"message":"..."}`. Unwrap that; fall back to the raw text for anything
 * that does not match, so an unexpected shape still surfaces rather than
 * rendering an empty box.
 */
export function cleanError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const m = /^\d+:\s*(\{[\s\S]*\})$/.exec(raw);
  if (m) {
    try {
      const parsed = JSON.parse(m[1]) as { message?: string };
      return parsed.message ?? raw;
    } catch {
      return raw;
    }
  }
  return raw;
}
