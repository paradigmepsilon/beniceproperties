// client/src/components/coliving-search-bar.tsx
// Hero/section search card for co-living ROOMS: Where + Move-in + Up-to-$/wk +
// Search. Mirrors search-bar.tsx's look (bnp-card, hairline-divided fields) but
// carries room semantics instead of nightly dates.
//
// Semantics differ from the STR SearchBar on purpose:
//   - Where   → filters the grid by city (same city state the chips drive).
//   - Budget  → filters rooms to those at or under the chosen weekly rate.
//   - Move-in → DISPLAY / PREFILL ONLY. Co-living has no live-availability
//               backend yet, so a move-in date can't filter the grid; it rides
//               along so the booking flow can prefill it later. Do not wire it
//               into filtering without a real availability source.

import { Search } from "lucide-react";

export interface ColivingSearchValue {
  city: string; // "ALL" or a cityOf() value
  moveIn: string; // ISO date or "" — prefill/display only (see header note)
  budget: string; // "ALL" or a weekly-rate cap as a string, e.g. "350"
}

interface Props {
  cities: string[];
  /** Weekly-rate caps (ascending, in dollars) derived from live room rates. */
  budgets: number[];
  value: ColivingSearchValue;
  onChange: (v: ColivingSearchValue) => void;
  onSearch: () => void;
}

export function ColivingSearchBar({ cities, budgets, value, onChange, onSearch }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const set = (patch: Partial<ColivingSearchValue>) => onChange({ ...value, ...patch });

  return (
    <div
      role="search"
      className="bnp-card flex w-full flex-col divide-y divide-border p-2 sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0"
    >
      <SearchField label="Where" htmlFor="coliving-city">
        <select
          id="coliving-city"
          value={value.city}
          onChange={(e) => set({ city: e.target.value })}
          className="min-h-[2.75rem] w-full cursor-pointer bg-transparent text-base text-foreground focus:outline-none sm:min-h-0 sm:text-sm"
          data-testid="coliving-city"
        >
          <option value="ALL">All locations</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </SearchField>

      <SearchField label="Move in" htmlFor="coliving-movein">
        <input
          id="coliving-movein"
          type="date"
          min={today}
          value={value.moveIn}
          onChange={(e) => set({ moveIn: e.target.value })}
          className="min-h-[2.75rem] w-full bg-transparent text-base text-foreground focus:outline-none sm:min-h-0 sm:text-sm"
          data-testid="coliving-movein"
        />
      </SearchField>

      <SearchField label="Weekly budget" htmlFor="coliving-budget">
        <select
          id="coliving-budget"
          value={value.budget}
          onChange={(e) => set({ budget: e.target.value })}
          className="min-h-[2.75rem] w-full cursor-pointer bg-transparent text-base text-foreground focus:outline-none sm:min-h-0 sm:text-sm"
          data-testid="coliving-budget"
        >
          <option value="ALL">Any price</option>
          {budgets.map((b) => (
            <option key={b} value={String(b)}>
              Up to ${b.toLocaleString()}/wk
            </option>
          ))}
        </select>
      </SearchField>

      <div className="flex items-stretch pt-2 sm:pl-2 sm:pt-0">
        <button
          onClick={onSearch}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent-foreground"
          data-testid="coliving-search-go"
        >
          <Search className="h-4 w-4" /> Search rooms
        </button>
      </div>
    </div>
  );
}

function SearchField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 rounded-lg px-4 py-2.5 transition-colors hover:bg-accent/60">
      <label htmlFor={htmlFor} className="mb-0.5 block text-xs font-bold tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}
