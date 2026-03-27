import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchStates, fetchCounties } from "@/lib/api";
import type { AssetFilters } from "@/lib/types";

const SORT_OPTIONS: { value: NonNullable<AssetFilters["sort"]>; label: string }[] = [
  { value: "newest",      label: "Newest" },
  { value: "price_asc",   label: "Price ↑" },
  { value: "price_desc",  label: "Price ↓" },
  { value: "acreage_asc", label: "Acreage ↑" },
  { value: "acreage_desc",label: "Acreage ↓" },
];

interface FilterBarProps {
  filters: AssetFilters;
  onChange: (next: AssetFilters) => void;
  total?: number | null;
}

function SelectField({ label, value, options, onSelect, placeholder }: {
  label: string;
  value: string | undefined;
  options: string[];
  onSelect: (v: string | undefined) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-cedar-muted text-[10px] font-sans tracking-widest uppercase">{label}</label>
      <select
        value={value ?? ""}
        onChange={e => onSelect(e.target.value || undefined)}
        className="bg-cedar-surface border border-cedar-border pl-3 pr-2 py-2 text-xs font-sans text-cedar-text focus:outline-none focus:border-cedar-muted cursor-pointer transition-colors duration-150 min-w-[140px]"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Acreage range dropdown ────────────────────────────────────────────────────

const ACREAGE_OPTIONS: { label: string; min?: number; max?: number }[] = [
  { label: "Any" },
  { label: "0–1 acre",      min: 0,   max: 1 },
  { label: "1–5 acres",     min: 1,   max: 5 },
  { label: "5–20 acres",    min: 5,   max: 20 },
  { label: "20–100 acres",  min: 20,  max: 100 },
  { label: "100+ acres",    min: 100 },
];

function acreageKey(min?: number, max?: number): string {
  const opt = ACREAGE_OPTIONS.find(o => o.min === min && o.max === max);
  return opt?.label ?? "Any";
}

function AcreageDropdown({ minAcreage, maxAcreage, onChange }: {
  minAcreage?: number;
  maxAcreage?: number;
  onChange: (min?: number, max?: number) => void;
}) {
  const value = acreageKey(minAcreage, maxAcreage);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-cedar-muted text-[10px] font-sans tracking-widest uppercase">Acreage</label>
      <select
        value={value}
        onChange={e => {
          const opt = ACREAGE_OPTIONS.find(o => o.label === e.target.value);
          onChange(opt?.min, opt?.max);
        }}
        className="bg-cedar-surface border border-cedar-border pl-3 pr-2 py-2 text-xs font-sans text-cedar-text focus:outline-none focus:border-cedar-muted cursor-pointer transition-colors duration-150 min-w-[140px]"
      >
        {ACREAGE_OPTIONS.map(o => (
          <option key={o.label} value={o.label}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Price range dropdown ──────────────────────────────────────────────────────

const PRICE_OPTIONS: { label: string; min?: number; max?: number }[] = [
  { label: "Any" },
  { label: "Under $1,000",        max: 1_000 },
  { label: "$1,000–$5,000",       min: 1_000,   max: 5_000 },
  { label: "$5,000–$25,000",      min: 5_000,   max: 25_000 },
  { label: "$25,000–$100,000",    min: 25_000,  max: 100_000 },
  { label: "$100,000+",           min: 100_000 },
];

function priceKey(min?: number, max?: number): string {
  const opt = PRICE_OPTIONS.find(o => o.min === min && o.max === max);
  return opt?.label ?? "Any";
}

function PriceDropdown({ minPrice, maxPrice, onChange }: {
  minPrice?: number;
  maxPrice?: number;
  onChange: (min?: number, max?: number) => void;
}) {
  const value = priceKey(minPrice, maxPrice);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-cedar-muted text-[10px] font-sans tracking-widest uppercase">Price (USDC)</label>
      <select
        value={value}
        onChange={e => {
          const opt = PRICE_OPTIONS.find(o => o.label === e.target.value);
          onChange(opt?.min, opt?.max);
        }}
        className="bg-cedar-surface border border-cedar-border pl-3 pr-2 py-2 text-xs font-sans text-cedar-text focus:outline-none focus:border-cedar-muted cursor-pointer transition-colors duration-150 min-w-[160px]"
      >
        {PRICE_OPTIONS.map(o => (
          <option key={o.label} value={o.label}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

export function FilterBar({ filters, onChange, total }: FilterBarProps) {
  const { data: statesData } = useQuery({
    queryKey: ["property-states"],
    queryFn: fetchStates,
    staleTime: 600_000,
  });

  const { data: countiesData } = useQuery({
    queryKey: ["property-counties", filters.state],
    queryFn: () => fetchCounties(filters.state),
    staleTime: 600_000,
    enabled: true,
  });

  const states   = statesData?.data ?? [];
  const counties = countiesData?.data ?? [];

  const hasActiveFilters = !!(
    filters.state ||
    filters.county ||
    filters.minAcreage != null ||
    filters.maxAcreage != null ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.search ||
    (filters.sort && filters.sort !== "newest") ||
    (filters.listingFilter && filters.listingFilter !== "listed")
  );

  function set(partial: Partial<AssetFilters>) {
    onChange({ ...filters, ...partial, page: 1 });
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top row: search + sort + page size */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 grow">
          <div className="relative w-full max-w-[380px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cedar-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by address, parcel, location…"
              value={filters.search ?? ""}
              onChange={e => set({ search: e.target.value || undefined })}
              className="w-full bg-cedar-surface border border-cedar-border pl-9 pr-4 py-2 text-sm font-sans text-cedar-text placeholder:text-cedar-muted/50
                         focus:outline-none focus:border-cedar-muted transition-colors duration-150"
            />
          </div>

          <select
            value={filters.sort ?? "newest"}
            onChange={e => set({ sort: e.target.value as AssetFilters["sort"] })}
            className="shrink-0 bg-cedar-surface border border-cedar-border pl-3 pr-1.5 py-2 text-xs font-sans text-cedar-muted
                       focus:outline-none focus:border-cedar-muted cursor-pointer transition-colors duration-150"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={filters.limit ?? 24}
            onChange={e => set({ limit: Number(e.target.value) })}
            className="shrink-0 bg-cedar-surface border border-cedar-border pl-3 pr-1.5 py-2 text-xs font-sans text-cedar-muted
                       focus:outline-none focus:border-cedar-muted cursor-pointer transition-colors duration-150"
            aria-label="Results per page"
          >
            {[24, 48, 100, 200].map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>

        <div className="hidden sm:flex items-center gap-3 sm:ml-auto">
          {total !== undefined && total !== null && (
            <span className="text-cedar-muted text-xs font-mono tabular-nums whitespace-nowrap">
              {total.toLocaleString("en-US")} properties
            </span>
          )}
          {total === null && (
            <span className="text-cedar-muted text-xs font-mono whitespace-nowrap">
              Many properties
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={() => onChange({ sort: "newest", page: 1, listingFilter: "listed", protocol: "fabrica" })}
              className="inline-flex items-center gap-1 text-cedar-muted text-xs hover:text-cedar-text transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Land filters row */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Status pills */}
        <div className="flex flex-col gap-1">
          <label className="text-cedar-muted text-[10px] font-sans tracking-widest uppercase">Status</label>
          <div className="flex gap-1.5">
            {[
              { value: "listed"   as const, label: "For Sale" },
              { value: "unlisted" as const, label: "Make Offer" },
              { value: "all"      as const, label: "All" },
            ].map(opt => {
              const active = (filters.listingFilter ?? "listed") === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => set({ listingFilter: opt.value })}
                  className={`px-3 py-2 text-xs font-sans tracking-wide border transition-colors duration-150 ${
                    active
                      ? "bg-cedar-amber text-cedar-bg border-cedar-amber"
                      : "border-cedar-border text-cedar-muted hover:border-cedar-muted hover:text-cedar-text"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* State dropdown */}
        <SelectField
          label="State"
          value={filters.state}
          options={states}
          onSelect={v => set({ state: v, county: undefined })}
          placeholder="All states"
        />

        {/* County dropdown */}
        <SelectField
          label="County"
          value={filters.county}
          options={counties}
          onSelect={v => set({ county: v })}
          placeholder="All counties"
        />

        {/* Acreage range */}
        <AcreageDropdown
          minAcreage={filters.minAcreage}
          maxAcreage={filters.maxAcreage}
          onChange={(min, max) => set({ minAcreage: min, maxAcreage: max })}
        />

        {/* Price range */}
        <PriceDropdown
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onChange={(min, max) => set({ minPrice: min, maxPrice: max })}
        />
      </div>
    </div>
  );
}
