// client/src/components/search-bar.tsx
// Hero search card: Where + Check-in + Check-out + Search. Hairline-divided
// fields on desktop, stacked on mobile. Where filters the grid by city; dates
// ride along on card links so the booking flow can prefill them.

import { Search } from "lucide-react";

export interface SearchValue {
  city: string; // "ALL" or a cityOf() value
  checkIn: string; // ISO date or ""
  checkOut: string;
}

interface Props {
  cities: string[];
  value: SearchValue;
  onChange: (v: SearchValue) => void;
  onSearch: () => void;
}

export function SearchBar({ cities, value, onChange, onSearch }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const set = (patch: Partial<SearchValue>) => onChange({ ...value, ...patch });

  return (
    <div
      role="search"
      className="bnp-card flex w-full flex-col divide-y divide-border p-2 sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0"
    >
      <SearchField label="Where" htmlFor="search-city">
        <select
          id="search-city"
          value={value.city}
          onChange={(e) => set({ city: e.target.value })}
          className="min-h-[2.75rem] w-full cursor-pointer bg-transparent text-sm text-foreground focus:outline-none sm:min-h-0"
          data-testid="search-city"
        >
          <option value="ALL">All locations</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </SearchField>
      <SearchField label="Check in" htmlFor="search-checkin">
        <input
          id="search-checkin"
          type="date"
          min={today}
          value={value.checkIn}
          onChange={(e) => set({ checkIn: e.target.value })}
          className="min-h-[2.75rem] w-full bg-transparent text-sm text-foreground focus:outline-none sm:min-h-0"
          data-testid="search-checkin"
        />
      </SearchField>
      <SearchField label="Check out" htmlFor="search-checkout">
        <input
          id="search-checkout"
          type="date"
          min={value.checkIn || today}
          value={value.checkOut}
          onChange={(e) => set({ checkOut: e.target.value })}
          className="min-h-[2.75rem] w-full bg-transparent text-sm text-foreground focus:outline-none sm:min-h-0"
          data-testid="search-checkout"
        />
      </SearchField>
      <div className="flex items-stretch pt-2 sm:pl-2 sm:pt-0">
        <button
          onClick={onSearch}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent-foreground"
          data-testid="search-go"
        >
          <Search className="h-4 w-4" /> Search stays
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
