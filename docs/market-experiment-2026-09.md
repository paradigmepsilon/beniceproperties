# BNP market-test inventory — 2026-09

Six co-living listings modeled on public for-sale listings in Charlotte, Charleston, and
Jacksonville, priced with the BNHG Co-Living Profitability Worksheet model. This file is the
owner's manifest: how to recognize the rows, where every price came from, and how to add or
remove them.

Status: **prepared, not applied.** Nothing has been written to the database. See "Runbook".

## How owners recognize these rows

- Every property and room carries the tag list `["market-test-2026-09", "src:zillow:<zpid>"]`
  in its `prior_names` column. Nothing on the public site reads `prior_names`, so the tag is
  invisible to guests and visible in the admin, Unified Ops, and any SQL.
- `properties.address` is the real listing address (guests see the city only; the full
  address renders on the property detail page the same way Hutchens and OBC do).
- `node scripts/seed-market-experiment.mjs --list` prints every tagged property and room with
  its id, status, rates, and photo count.
- To hide them all without deleting: `UPDATE properties SET active = false WHERE prior_names ? 'market-test-2026-09';`
  (or `--apply --inactive` at seed time and flip `active` from the admin when ready).

## The six properties and 22 rooms

Model: `monthly = 65% x comparable 1-bed rent + room premium + property premium`
(`benicehospitality/src/lib/resources/breakeven-analysis-worksheet/pricing.ts`, unchanged).
BNP tiers follow the live convention on Hutchens: `weekly = monthly / 4` rounded to $5,
`monthly_rate = weekly x 4`, `daily_rate = round(weekly / 7)`, deposit $200, cleaning fee $0.
Every room includes weekly housekeeping + linens (+$50) and every property includes utilities +
Wi-Fi (+$105), matching what the existing BNP listings advertise.

| Property (BNP name) | Source listing | 1-bed comp | Walk / Transit / Bike | Property premium | Rooms | Weekly range | Gross model $/mo |
|---|---|---|---|---|---|---|---|
| Midwood Bungalow | [1900 Thomas Ave, Charlotte NC 28205](https://www.zillow.com/homedetails/1900-Thomas-Ave-Charlotte-NC-28205/6187957_zpid/) — $799k, 3/1, 1,454 sqft, 1925 | $1,482 (Zumper, Plaza Midwood, Sep 2026) | 69 / 43 / 53 | $215 | 3 | $310–$320 | $3,824 |
| Dilworth House | [2121 Charlotte Dr, Charlotte NC 28203](https://www.zillow.com/homedetails/2121-Charlotte-Dr-Charlotte-NC-28203/6221718_zpid/) — $1.55M, 5/3, 2,630 sqft, 1941 | $1,665 (Zumper, Dilworth, Sep 2026) | 80 / 35 / 57 | $250 | 5 | $350–$400 | $7,255 |
| Montibello House | [5400 McAlpine Farm Rd, Charlotte NC 28226](https://www.zillow.com/homedetails/5400-McAlpine-Farm-Rd-Charlotte-NC-28226/6297403_zpid/) — $1.55M, 5/4, 4,040 sqft, 1976, pool | $1,520 (Zumper, McAlpine, Jul 2026) | 9 / 11 / 18 | $200 | 5 | $325–$375 | $6,850 |
| Ponderosa House | [766 Ponderosa Dr, Charleston SC 29414](https://www.zillow.com/homedetails/766-Ponderosa-Dr-Charleston-SC-29414/68397046_zpid/) — $435k, 3/2, 1,502 sqft, 2004 | $1,645 (RentCafe, West Ashley / Carolina Bay, Aug 2026) | 3 / 1 / 25 | $220 | 3 | $350–$385 | $4,347 |
| Meeting Street Cottage | [700 Meeting St, Charleston SC 29403](https://www.zillow.com/homedetails/700-Meeting-St-Charleston-SC-29403/10908697_zpid/) — $799.9k, 3/2, 1,104 sqft, 1920 (renovated) | $2,110 (Zumper, East Central, Jul 2026) | 75 / 39 / 66 | $235 | 3 | $415–$465 | $5,241 |
| Beauclerc House | [9042 Warwickshire Rd, Jacksonville FL 32257](https://www.zillow.com/homedetails/9042-Warwickshire-Rd-Jacksonville-FL-32257/44549124_zpid/) — $315k, 3/2, 1,456 sqft, 1975 | $1,289 (Zumper, Mandarin, Sep 2026) | 36 / 30 / 41 | $220 | 3 | $290–$330 | $3,654 |

Per-room breakdown (size band, room features, base / premiums, model monthly, BNP tiers) is in
`scripts/data/market_experiment_2026_09.json` under each room's `pricing` block.

### Modeling decisions worth knowing

- **Private baths** were assigned only where the listing states or clearly implies an en-suite
  (primary suites; Montibello's basement suite with its own entrance). Everything else is a
  shared bath. This is the biggest lever in the model (+$150) so it was kept conservative.
- **Parking** (+$40) was assigned per room only up to the spaces the listing shows: two driveway
  spaces at Midwood (rooms 1–2), garage + driveway at Dilworth (rooms 1–2), circular drive at
  Montibello (all five), two-car garage + drive at Ponderosa and Beauclerc (all three), two
  off-street spaces at Meeting St (rooms 1–2).
- **Size bands** are inferred from square footage and layout, not measured: primary suites in
  the larger homes are "Over 200 sqft", the two secondary rooms in the 1,104 sqft Meeting Street
  cottage are "Under 120 sqft", everything else is "120 to 200 sqft".
- **"Upgraded"** (+$40) was set where the listing describes a renovation or remodeled kitchen
  (Dilworth, Ponderosa, Meeting St, Beauclerc); not for the 1925 Midwood bungalow or the 1976
  Montibello ranch.
- **Walk / Transit / Bike scores** come from the Walk Score figures shown on the Zillow page
  (Midwood) and the Redfin pages (the other five; Redfin shows them out of 10, multiplied by 10).
- The model flags four private-bath suites (Dilworth #1, Montibello #1 and #5, Beauclerc #1)
  as priced above 95% of the local 1-bed comp. That is the model's usual warning on ensuite
  rooms, not an error; the worksheet leaves the decision to the operator, so the prices stand.
- **Comp sources.** No single source had a 1-bed figure for every neighborhood. Zumper's
  neighborhood reports were used where they exist; West Ashley uses RentCafe's Carolina Bay
  figure (a newer complex in 29414, likely a touch high for the older Ponderosa streets).
  HUD Small Area FMRs were the intended anchor but the FY2026 files were not retrievable
  from here; swap them in if you want a government source.

## Runbook

### Local preview on :3008 (Neon branch, production untouched)

The dev server on :3008 normally runs against the production database (the `.env`
`DATABASE_URL`). `scripts/market-test-preview.sh` creates a Neon branch off production, seeds
the inventory into it, and restarts :3008 against the branch. Needs a Neon CLI login once
(`npx neonctl auth`, browser); the stored session on this machine was rejected on 2026-09-14.

```bash
npx neonctl auth                                                     # once, opens a browser
bash scripts/market-test-preview.sh                                  # placeholder art
bash scripts/market-test-preview.sh --photos --r2-env "../Unified Ops Folder/Unified-Ops/.env"
# when done:
npx neonctl branches delete market-test-preview --project-id <id>
```

`--r2-env` reads ONLY the `R2_*` keys from that file (UO's `.env` holds the same bucket's
credentials and `R2_PUBLIC_URL_BASE`); its `DATABASE_URL` is never touched.

### Production (owner-run)

The classifier blocks this session from touching the production database, so these are yours
to run from the BNP repo with `.env` pointing at production.

```bash
# 0. Backup first (repo floor #1 — data-only, but still).
node scripts/backup-tables.mjs properties rooms

# 1. Dry run — validates the data file and prints the plan. Makes no DB connection.
node scripts/seed-market-experiment.mjs --photos --r2-env "../Unified Ops Folder/Unified-Ops/.env"

# 2. Insert. Add --inactive to seed hidden, then flip `active` per property from the admin.
#    BNP's .env has no R2 vars; --r2-env borrows UO's (R2_* keys only).
node scripts/seed-market-experiment.mjs --apply --photos --r2-env "../Unified Ops Folder/Unified-Ops/.env"

# 3. Confirm.
node scripts/seed-market-experiment.mjs --list
curl -s https://beniceproperties.vercel.app/api/properties | jq '.[] | select(.priorNames[]? == "market-test-2026-09") | {name, location, fromWeeklyRent}'

# 4. Arrival info (only if you ever intend to APPROVE a short stay on one of these — approve
#    returns 409 without wifiSsid + directions). Add the six to scripts/access-info.local.json
#    and run:
node scripts/set-access-info.mjs --apply

# Remove everything tagged (refuses if any booking or lease references them):
node scripts/seed-market-experiment.mjs --remove
```

Re-runs are safe: a property whose name already exists is skipped with its rooms.

## Things to decide before flipping live

- **Photos are the listing brokers' MLS photos.** They are held locally in
  `scripts/data/market-experiment-photos/` (gitignored) and are only uploaded with `--photos`.
  Publishing MLS photography on a commercial site without the broker's or photographer's
  permission is a copyright exposure; Zillow's and Redfin's terms also prohibit re-use. If the
  experiment runs public for any length of time, run without `--photos` (the site shows its
  branded placeholder art) or replace them with licensed / AI-generated images.
- **Real addresses on a public site.** The full address shows on each property detail page,
  exactly as it does for Hutchens and OBC. These are homes currently for sale by other people.
  If that's not the intent, set `address` to the neighborhood only before applying.
- **Inquiries will be real.** Rooms seed as `AVAILABLE`, so guests can request them and
  Telegram will ping you like any other booking. Have the "not available" reply ready, or seed
  `--inactive` and flip on only what you want to test.
- **Fair-housing / advertising rules.** Advertising housing you do not control is a
  misrepresentation risk in NC, SC, and FL. Flagging, not judging — your call and a lawyer's.

## Files

- `scripts/data/market_experiment_2026_09.json` — all content, prices, provenance
- `scripts/seed-market-experiment.mjs` — dry-run / apply / list / remove; `--r2-env` for photos
- `scripts/market-test-preview.sh` — Neon branch + seed + dev server on :3008, production untouched
- `scripts/seed-market-experiment.test.ts` — pins the data to the real insert schemas + tier math
- `client/src/content/neighborhoods.ts` — Charlotte, Charleston, Jacksonville neighborhood blocks
- `scripts/data/market-experiment-photos/` — 30 listing photos, gitignored
