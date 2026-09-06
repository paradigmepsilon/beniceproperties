// server/lib/sessionSecret.ts
// The express-session signing secret. In production it MUST come from env — a
// known fallback would let anyone mint an admin session cookie. Outside
// production a clearly-marked dev secret keeps local boot frictionless.

export function resolveSessionSecret(env: { SESSION_SECRET?: string; NODE_ENV?: string }): string {
  const configured = env.SESSION_SECRET?.trim();
  if (configured) return configured;
  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production (admin sessions cannot use the dev fallback)");
  }
  return "bnp-dev-only-secret";
}
