// scripts/rotate-uo-token.test.ts
// The script's real run edits two .env files and prints Vercel commands for the
// owner; a test never does either. What IS pinned here: the .env rewrite is
// lossless and never duplicates a key, the key names match what each side of the
// wire actually reads, the URL check rejects every shape that silently 401s, and
// — the load-bearing one — no code path can print the token.

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  BNP_TOKEN_KEY,
  UO_TOKEN_KEY,
  UO_URL_KEY,
  CANONICAL_BNP_API_URL,
  fingerprint,
  generateToken,
  readEnvValue,
  hasEnvKey,
  upsertEnvLine,
  assertTokenFilePathSafe,
  parseArgs,
  describeUrl,
} from "./rotate-uo-token.mjs";

describe("the key names match what each side reads", () => {
  it("BNP's middleware reads UO_BNP_API_TOKEN as a Bearer token", () => {
    const src = readFileSync(new URL("../server/lib/serviceAuth.ts", import.meta.url), "utf8");
    expect(src).toContain(`process.env.${BNP_TOKEN_KEY}`);
    expect(src).toContain('startsWith("Bearer ")');
  });

  it("the canonical URL is an origin: https, www, no trailing slash, no path", () => {
    const u = new URL(CANONICAL_BNP_API_URL);
    expect(u.protocol).toBe("https:");
    expect(u.host).toBe("www.beniceproperties.com");
    expect(u.pathname).toBe("/");
    expect(CANONICAL_BNP_API_URL.endsWith("/")).toBe(false);
  });
});

describe("env rewriting is lossless", () => {
  const sample = [
    "# leading comment",
    "UNRELATED=keep-me",
    "",
    `${UO_TOKEN_KEY}=old-value`,
    "# commented out, must not be treated as an assignment:",
    `# ${UO_URL_KEY}=http://decoy`,
    "TRAILING=yes",
    "",
  ].join("\n");

  it("replaces an existing key in place instead of appending a duplicate", () => {
    const out = upsertEnvLine(sample, UO_TOKEN_KEY, "new-value");
    expect(out.split("\n").filter((l) => l.startsWith(`${UO_TOKEN_KEY}=`))).toEqual([
      `${UO_TOKEN_KEY}=new-value`,
    ]);
    expect(readEnvValue(out, UO_TOKEN_KEY)).toBe("new-value");
    // Position preserved => a one-line diff.
    expect(out.split("\n").indexOf(`${UO_TOKEN_KEY}=new-value`)).toBe(
      sample.split("\n").indexOf(`${UO_TOKEN_KEY}=old-value`),
    );
  });

  it("appends a key that is absent, and every other line survives byte-identical", () => {
    const out = upsertEnvLine(sample, UO_URL_KEY, CANONICAL_BNP_API_URL);
    expect(readEnvValue(out, UO_URL_KEY)).toBe(CANONICAL_BNP_API_URL);
    const untouched = (text: string) =>
      text.split("\n").filter((l) => !l.startsWith(`${UO_URL_KEY}=`));
    expect(untouched(out)).toEqual(untouched(sample));
  });

  it("ignores a commented-out assignment rather than editing it", () => {
    expect(hasEnvKey(sample, UO_URL_KEY)).toBe(false);
    expect(readEnvValue(sample, UO_URL_KEY)).toBe("");
    const out = upsertEnvLine(sample, UO_URL_KEY, CANONICAL_BNP_API_URL);
    expect(out).toContain(`# ${UO_URL_KEY}=http://decoy`);
  });

  it("distinguishes an absent key from one assigned an empty string", () => {
    // This is exactly the bug that produced the "Connect BNP API" notice: the
    // key WAS present, with nothing after the `=`.
    const empty = `${UO_TOKEN_KEY}=\n`;
    expect(hasEnvKey(empty, UO_TOKEN_KEY)).toBe(true);
    expect(readEnvValue(empty, UO_TOKEN_KEY)).toBe("");
    expect(hasEnvKey("OTHER=1\n", UO_TOKEN_KEY)).toBe(false);
  });

  it("strips matched surrounding quotes and tolerates `export`", () => {
    expect(readEnvValue(`${UO_URL_KEY}="https://x.test"\n`, UO_URL_KEY)).toBe("https://x.test");
    expect(readEnvValue(`export ${UO_URL_KEY}=https://x.test\n`, UO_URL_KEY)).toBe("https://x.test");
  });

  it("keeps the file newline-terminated whether or not it started that way", () => {
    expect(upsertEnvLine("A=1", "B", "2")).toBe("A=1\nB=2\n");
    expect(upsertEnvLine("A=1\n", "B", "2")).toBe("A=1\nB=2\n");
    expect(upsertEnvLine("", "B", "2")).toBe("B=2\n");
  });
});

describe("URL shapes that silently 401", () => {
  it("rejects the two forms that broke UO", () => {
    // No scheme: fetch() cannot parse it at all.
    expect(describeUrl("beniceproperties.com").ok).toBe(false);
    expect(describeUrl("beniceproperties.com").detail).toMatch(/no scheme/);
    // Apex 308-redirects to www; undici strips Authorization cross-origin.
    expect(describeUrl("https://beniceproperties.com").detail).toContain("https://beniceproperties.com");
  });

  it("rejects a trailing slash or a path, accepts the canonical origin", () => {
    expect(describeUrl(`${CANONICAL_BNP_API_URL}/`).ok).toBe(false);
    expect(describeUrl(`${CANONICAL_BNP_API_URL}/api/uo`).ok).toBe(false);
    expect(describeUrl(`${CANONICAL_BNP_API_URL}/api/uo`).detail).toMatch(/must be the origin only/);
    expect(describeUrl(CANONICAL_BNP_API_URL).ok).toBe(true);
    expect(describeUrl("").detail).toBe("(empty)");
  });
});

describe("argument handling", () => {
  it("defaults to a dry run", () => {
    expect(parseArgs([])).toMatchObject({ writeLocal: false, verify: false, token: null });
  });

  it("rejects unknown flags, short tokens, and --verify with --write-local", () => {
    expect(() => parseArgs(["--apply"])).toThrow(/unknown argument/);
    expect(() => parseArgs(["--token=short"])).toThrow(/at least 32/);
    expect(() => parseArgs(["--verify", "--write-local"])).toThrow(/mutually exclusive/);
  });

  it("--emit-token-file demands a destination and refuses to combine with the others", () => {
    // Re-creating the scratch file after `rm -P` must never require a second
    // rotation — that would open another window of 401s for no reason.
    expect(() => parseArgs(["--emit-token-file"])).toThrow(/requires --token-file/);
    expect(() => parseArgs(["--emit-token-file", "--token-file=/tmp/t", "--write-local"])).toThrow(
      /mutually exclusive/,
    );
    expect(parseArgs(["--emit-token-file", "--token-file=/tmp/t"])).toMatchObject({
      emit: true,
      writeLocal: false,
      tokenFile: "/tmp/t",
    });
  });

  it("refuses a --token-file inside either repo, where it could be committed", () => {
    const repos = ["/repo/bnp", "/repo/uo"];
    expect(() => assertTokenFilePathSafe("/repo/bnp/token.txt", repos)).toThrow(/outside the repos/);
    expect(() => assertTokenFilePathSafe("/repo/uo/nested/token.txt", repos)).toThrow(/outside the repos/);
    expect(assertTokenFilePathSafe("/tmp/uo-token.txt", repos)).toBe("/tmp/uo-token.txt");
    // A sibling that merely shares a prefix is not inside the repo.
    expect(assertTokenFilePathSafe("/repo/bnp-scratch/t.txt", repos)).toBe("/repo/bnp-scratch/t.txt");
  });
});

describe("the token is never disclosed", () => {
  it("generates 64 hex chars from the CSPRNG, distinct each call", () => {
    const a = generateToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(generateToken());
  });

  it("fingerprints are short, stable, and reveal nothing", () => {
    const token = "a".repeat(64);
    const fp = fingerprint(token);
    expect(fp).toHaveLength(12);
    expect(fp).toBe(fingerprint(token));
    expect(fp).not.toContain(token.slice(0, 8));
    expect(fingerprint("b".repeat(64))).not.toBe(fp);
    expect(fingerprint("")).toBe("(empty)");
  });

  it("no console call in the script can print a token value", () => {
    const src = readFileSync(new URL("./rotate-uo-token.mjs", import.meta.url), "utf8");
    const calls = [...src.matchAll(/console\.(log|error)\(([\s\S]{0,900}?)\);/g)].map((m) => m[2]);
    expect(calls.length).toBeGreaterThan(0);

    // Anything that reaches stdout is either literal prose or an interpolated
    // expression. Prose is harmless (the word "token" appears all over the
    // report); only the expressions can leak a value, so check those directly…
    // Trailing \b matters: `tokenFile` is a path and is fine to print.
    const secretish = /\btoken\b|\bbefore\.(bnp|uo)\b/;
    for (const call of calls) {
      for (const expr of call.matchAll(/\$\{([\s\S]*?)\}/g)) {
        const inner = expr[1]
          .replace(/fingerprint\([^)]*\)/g, "FP")
          // `${token.length}` is a character count, not the value — the report
          // uses it to show the new token is the expected 64 chars.
          .replace(/\btoken\.length\b/g, "LEN")
          // Only a ternary's BRANCHES are printed; the condition just tests
          // truthiness (`args.token ? "supplied" : "generated"`), so drop it.
          .replace(/^[^?]*\?/, "");
        expect(inner, `interpolation: ${expr[1].slice(0, 80)}`).not.toMatch(secretish);
      }
      // …and separately, that no bare identifier is passed as an argument, with
      // every string and template literal stripped out first so prose can't trip it.
      const codeOnly = call
        .replace(/`[\s\S]*?`/g, "``")
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/fingerprint\([^)]*\)/g, "FP");
      expect(codeOnly, codeOnly.slice(0, 90)).not.toMatch(/\btoken\b(?!File)/);
    }
  });

  it("writes the raw token only to the env files and the 0600 token file", () => {
    const src = readFileSync(new URL("./rotate-uo-token.mjs", import.meta.url), "utf8");
    const writes = [...src.matchAll(/writeFileSync\(([\s\S]{0,200}?)\);/g)].map((m) => m[1]);
    // Exactly five: the shared backup() helper, BNP .env, UO .env, and the
    // token file written by --write-local and by --emit-token-file.
    expect(writes.length).toBe(5);
    // Every one of them lands on disk owner-only — .env files and the scratch
    // token file all hold the live credential.
    for (const w of writes) {
      expect(w, w.slice(0, 90)).toContain("0o600");
    }
    // The token file is written without a trailing newline, or `vercel env add`
    // would store a value one byte longer than the one BNP checks.
    expect(src).toMatch(/writeFileSync\(tokenFile, token, \{ mode: 0o600 \}\)/);
  });

  it("never calls out to Vercel or the network itself", () => {
    const src = readFileSync(new URL("./rotate-uo-token.mjs", import.meta.url), "utf8");
    expect(src).not.toMatch(/execSync|spawnSync|child_process|\bfetch\(/);
  });
});
