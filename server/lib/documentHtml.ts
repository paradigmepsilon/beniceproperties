// server/lib/documentHtml.ts
// =============================================================================
// The HTML primitives shared by every signable document this app renders: the
// co-living Room Rental Agreement and the short-stay Rental Agreement.
//
// The SIGNATURE BLOCK is the reason this file exists. Its wording is legally
// load-bearing — it is the E-SIGN Act / UETA attestation that makes a typed name
// binding — and two copies of it would eventually drift. One copy, used by both.
//
// Documents are self-contained HTML with inline styles and no external assets,
// stored inline in Postgres and printed to PDF by the guest's browser. There is
// no PDF library in this app, deliberately.
// =============================================================================

/** Escape for HTML text content. Every interpolated value goes through this. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface SignatureCapture {
  signedName: string;
  signedAt: Date;
  signedIp: string;
}

/**
 * The one E-SIGN / UETA attestation sentence. A guest types their legal name
 * under this text, so its wording is what makes the signature enforceable.
 * Do not reword without counsel.
 */
export const ESIGN_ATTESTATION =
  "By typing my full legal name below and submitting this Agreement, I acknowledge that I " +
  "have read and agree to its terms, and I intend my typed name to be my legally binding " +
  "electronic signature under the U.S. E-SIGN Act and UETA.";

/**
 * A complete standalone document page. Self-contained by design: no external
 * stylesheet or script, so the stored artifact renders identically forever and
 * an `<iframe sandbox="" srcDoc>` can display it with scripting disabled.
 */
export function documentPage(title: string, inner: string): string {
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${esc(title)}</title>` +
    `<style>body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:32px auto;` +
    `padding:0 20px;color:#1a1a1a}@media print{body{margin:0}}</style></head>` +
    `<body>${inner}</body></html>`
  );
}

/** The pre-signature footer: the attestation plus an explicit "not yet signed". */
export function awaitingSignatureHtml(attestation: string = ESIGN_ATTESTATION): string {
  return (
    `<section style="margin-top:24px"><p style="line-height:1.5">${esc(attestation)}</p>` +
    `<p style="color:#777">— Awaiting signature —</p></section>`
  );
}

/**
 * The executed signature block: who signed, exactly when (ISO 8601, UTC), and
 * from what IP. The timestamp and IP are the evidentiary part — they are what
 * makes the record defensible later, so they are rendered verbatim rather than
 * formatted for readability.
 */
export function signatureBlockHtml(
  signature: SignatureCapture,
  attestation: string = ESIGN_ATTESTATION,
): string {
  return (
    `<section style="margin-top:24px;border-top:2px solid #1a1a1a;padding-top:16px">` +
    `<p style="line-height:1.5">${esc(attestation)}</p>` +
    `<div style="margin-top:12px;font-size:14px">` +
    `<div><strong>Signed by:</strong> ${esc(signature.signedName)}</div>` +
    `<div><strong>Date &amp; time:</strong> ${esc(signature.signedAt.toISOString())}</div>` +
    `<div><strong>IP address:</strong> ${esc(signature.signedIp)}</div>` +
    `<div style="margin-top:8px;color:#555">Electronically signed under the E-SIGN Act / UETA.</div>` +
    `</div></section>`
  );
}

/** Replace every {{token}} that has a value in `tokens`. */
export function fillTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : whole,
  );
}
