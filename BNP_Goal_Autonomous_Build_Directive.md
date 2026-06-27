# /goal — BNP Booking + Lease + Payment Platform (Autonomous Build Directive)

**Use:** Paste this as a single `/goal` directive to your Claude Code instance, immediately followed by `PROMPT 0 — Shared Context` and the full phase spec from `BNP_Booking_Lease_Build_Prompt.md`. This directive governs *how* you execute that spec autonomously. The phase spec governs *what* you build.

**Repo:** `https://github.com/paradigmepsilon/beniceproperties` · **Live:** `https://beniceproperties.vercel.app`

---

## GOAL

Build out the BNP booking platform to completion per the nine-phase spec in `BNP_Booking_Lease_Build_Prompt.md`: a one-stop guest platform to book STR and co-living stays, sign leases, pay on recurring schedules, self-serve, and be managed from Unified Ops.

**You have standing authority to plan, build, test, commit, and self-advance through phases WITHOUT asking for approval — EXCEPT at the two mandatory review gates and the halt conditions defined below.** Do not ask me for direction on decisions already answered in the spec or in PROMPT 0. Do not ask permission to move from one autonomous phase to the next. Make reasonable engineering choices and keep moving.

---

## AUTONOMY MAP

| Phase | Mode | Behavior |
|-------|------|----------|
| 1 — Data model | **Autonomous** | Build, migrate (test DB), self-advance. |
| 2 — Booking flow | **Autonomous** | Build, self-advance. |
| 3 — Lease + e-sign | **Autonomous** | Build, self-advance. |
| **4 — Payments / saved card / scheduler** | **🛑 HARD GATE** | Build to completion, then STOP. Present working code for review. Do not advance until I reply "go." |
| **5 — Reminders / failures / late fees / defaults** | **🛑 HARD GATE** | Build to completion, then STOP. Present working code for review. Do not advance until I reply "go." |
| 6 — Guest portal | **Autonomous** | Build, self-advance. |
| 7 — Lifecycle automation | **Autonomous** | Build, self-advance. |
| 8 — UO integration | **Autonomous** | Build, self-advance. |
| 9 — Hardening / reconciliation / expansion test | **Autonomous** | Build, then STOP (final review). |

**Why 4 and 5 gate:** they are the only phases that move real money, save payment credentials, and accrue charges against guests. A bug there is not reversible after it hits a live card. Every other phase is reversible or non-financial, so it runs unattended.

**At each gate, present (not a plan — working code):**
1. What was built and which files changed.
2. How money flow was tested (test-mode evidence — the actual test output).
3. The metadata on a sample PaymentIntent (prove the Stripe Metadata Contract is fully populated).
4. The payment-schedule / late-fee state machine as built, with edge cases handled.
5. Anything you were unsure about and the choice you made.

Then stop and wait for "go."

---

## NON-NEGOTIABLE FLOORS (apply in every phase, autonomous or gated)

1. **No destructive migration without an export first.** Any `DROP`, column removal, or data-losing change: export the affected table(s) to a flat file under `/docs/migration-backups/` BEFORE running the migration. No exceptions, even in autonomous phases.

2. **Test-mode Stripe only.** Use Stripe **test keys** for all development and all self-testing. Never execute a live charge. The switch to live keys is a manual step I perform — never flip it, never hard-code a live key, never assume live mode. If a phase appears to require live keys to proceed, that is a halt condition (below), not a thing you decide.

3. **Every phase writes to `/docs/build-log.md`.** Append an outcome entry per phase: what was built, files touched, tests run + results, decisions made, anything deferred. This file is the session memory across separate Claude Code runs — keep it current so any future session can resume from it.

4. **Halt-and-ask on genuine ambiguity — do not guess.** If you hit a decision that is NOT answered in the spec or PROMPT 0 and where guessing wrong has a real cost (money, legal, data loss, security, or an irreversible action), STOP and ask, even mid-phase in an autonomous phase. Guessing is only acceptable for low-stakes, reversible engineering choices (naming, file structure, component layout). When in doubt about whether something is high-stakes, treat it as high-stakes and ask.

---

## HALT CONDITIONS (stop and ask, regardless of autonomy mode)

Beyond floor #4, halt immediately if you encounter any of:
- A requirement that would need live Stripe keys, real guest PII, or production credentials to proceed.
- A conflict between the spec, PROMPT 0, and the actual repo code that you cannot resolve without a judgment call about intent.
- A schema change to an EXISTING TRAD table that could affect the live TRAD app (this repo is shared-pattern but the TRAD app is live revenue — do not break it).
- Any action that writes to a Unified Ops database directly (forbidden — BNP owns its data; UO reads via API only).
- A point where the only way forward is to violate one of the architectural rules in PROMPT 0.
- Test suite or build failing in a way you cannot fix in two attempts without changing the spec's intent.

When you halt: state the condition, what you need from me, and the smallest decision that unblocks you. Don't re-explain the whole build.

---

## OPERATING DISCIPLINE (autonomous phases)

- **Read before writing**, every phase. Read the real repo files named in PROMPT 0. Mirror existing TRAD conventions.
- **Commit per phase** with a clear message referencing the phase number. Keep commits scoped and reversible.
- **Test before advancing.** A phase isn't "done" until its tests pass. Don't self-advance on red.
- **Don't gold-plate.** Build what the phase specifies. If you spot a worthwhile improvement outside scope, note it in `/docs/build-log.md` under "Deferred / suggested" — don't build it.
- **Respect the expansion rule.** No hard-coded property/room identities, ever. If you catch yourself typing "Hutchens" or "TRAD" into logic rather than data, stop and generalize.
- **Stay quiet while working.** In autonomous phases I don't need progress narration. I need: phase complete → log written → advancing. The build log is the record; surface it, don't chat it.

---

## WHAT I DO NOT WANT TO BE ASKED

To be explicit, so you don't bounce these back to me — they're already decided:
- Stripe is shared with TRAD; metadata does the entity/property/room breakout. (PROMPT 0)
- Saved card + your own scheduler, not Stripe Subscriptions. (Spec Phase 4)
- In-app typed e-signature, not a third-party provider. (Spec Phase 3)
- Cadences are exactly Weekly / Bi-weekly / Monthly; first payment due on booking. (Spec Phase 1)
- Late fee $25/day from the day after due date, accrues indefinitely, auto-billed as a separate line item. (Spec Phase 5)
- Co-living allows manual payment, settled via UO "Mark Paid." (Spec Phase 4/8)
- UO reads this app + constrained write-backs; BNP owns its data. (PROMPT 0 / Phase 8)

Don't ask me to reconfirm any of the above. Build it.

---

## START

Begin at Phase 1. Run autonomously through Phase 3. Stop at the Phase 4 gate. Keep `/docs/build-log.md` current the whole way.
