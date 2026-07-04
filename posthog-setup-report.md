<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of the BNP booking platform with PostHog server-side analytics. A singleton `posthog-node` client was created at `server/lib/posthog.ts`. Guest identification (`posthog.identify`) fires on both booking creation and lease creation, linking the guest's email as their PostHog `distinctId`. Admin identification fires on successful admin login. Exception autocapture is wired into the Express error handler so 5xx errors are forwarded to PostHog automatically. All 14 events are captured in the server layer — no client-side bundle changes were needed, so no reverse proxy is required.

| Event | Description | File |
|---|---|---|
| `booking_created` | Fired when a guest submits a booking request (STR or short co-living stay), capturing property, dates, payment method, and quoted total. | `server/routes.ts` |
| `booking_confirmed` | Fired when a Stripe checkout.session.completed webhook confirms that a booking payment succeeded. | `server/routes.ts` |
| `lease_created` | Fired when a co-living draft lease and payment schedule are persisted (PENDING_SIGNATURE state). | `server/routes.ts` |
| `lease_signed` | Fired when a guest submits their typed e-signature and the lease moves to PENDING_FIRST_PAYMENT. | `server/routes.ts` |
| `deposit_payment_started` | Fired when a co-living guest initiates the deposit payment flow, creating a Stripe PaymentIntent. | `server/routes.ts` |
| `lease_activated` | Fired via the Stripe payment_intent.succeeded webhook when the deposit is confirmed and the lease becomes ACTIVE. | `server/routes.ts` |
| `scheduled_rent_paid` | Fired via the Stripe payment_intent.succeeded webhook when a scheduled rent installment is confirmed paid. | `server/routes.ts` |
| `payment_failed` | Fired via the Stripe payment_intent.payment_failed webhook when a scheduled rent charge is declined. | `server/routes.ts` |
| `portal_installment_paid` | Fired when a guest uses the self-serve portal to pay an open or late installment ahead of schedule. | `server/routes.ts` |
| `guest_message_submitted` | Fired when a guest submits a question or maintenance request through the portal. | `server/routes.ts` |
| `license_uploaded` | Fired when a guest uploads their driver's license for identity verification. | `server/routes.ts` |
| `verification_approved` | Fired when an admin approves a tenant's identity verification, activating the lease. | `server/routes.ts` |
| `admin_login` | Fired when an admin successfully authenticates, identifying the admin session. | `server/auth.ts` |
| `manual_payment_confirmed` | Fired when an admin manually marks a CashApp or Zelle payment as received and confirms the booking. | `server/routes.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/497961/dashboard/1799584)
- [Bookings over time (wizard)](https://us.posthog.com/project/497961/insights/n961Fvuq)
- [Payment failures (wizard)](https://us.posthog.com/project/497961/insights/1Ho99DvH)
- [Lease pipeline — created vs signed vs activated (wizard)](https://us.posthog.com/project/497961/insights/jbwsOK5j)
- [Booking confirmation rate (wizard)](https://us.posthog.com/project/497961/insights/YHesyDWB)
- [Revenue events by type (wizard)](https://us.posthog.com/project/497961/insights/sx97t6hX)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite (`npm test`) — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Confirm the returning-visitor path also calls `identify` — the current integration identifies on fresh booking/lease/login but not on returning portal sessions. Consider calling `posthog.identify` in the `GET /api/portal/:token` handler so portal views are always correlated.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
