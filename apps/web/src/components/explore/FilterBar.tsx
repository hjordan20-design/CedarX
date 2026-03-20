import { Search, X } from "lucide-react";
import type { AssetFilters, Category } from "@/lib/types";

const CATEGORIES: { value: Category | ""; label: string }[] = [
  { value: "",              label: "All" },
  { value: "real-estate",  label: "Real Estate" },
  { value: "luxury-goods", label: "Luxury Goods" },
  { value: "art",          label: "Art" },
  { value: "collectibles", label: "Collectibles" },
];

const SORT_OPTIONS: { value: AssetFilters["sort"]; label: string }[] = [
  { value: "newest",     label: "Newest" },
  { value: "price_asc",  label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "volume",     label: "Volume" },
];

interface FilterBarProps {
  filters: AssetFilters;
  onChange: (next: AssetFilters) => void;
  total?: number;
}

function PillGroup<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = (value ?? "") === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`px-3 py-1 text-xs font-sans tracking-wide border transition-colors duration-150 ${
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
  );
}

export function FilterBar({ filters, onChange, total }: FilterBarProps) {
  const hasActiveFilters = filters.category || filters.search || filters.sort !== "newest";

  function set(partial: Partial<AssetFilters>) {
    onChange({ ...filters, ...partial, page: 1 });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cedar-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, location…"
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value || undefined })}
            className="w-full bg-cedar-surface border border-cedar-border pl-9 pr-4 py-2 text-sm font-sans text-cedar-text placeholder:text-cedar-muted/50
                       focus:outline-none focus:border-cedar-muted transition-colors duration-150"
          />
        </div>

        <select
          value={filters.sort ?? "newest"}
          onChange={(e) => set({ sort: e.target.value as AssetFilters["sort"] })}
          className="bg-cedar-surface border border-cedar-border px-3 py-2 text-xs font-sans text-cedar-muted
                     focus:outline-none focus:border-cedar-muted cursor-pointer transition-colors duration-150"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-3 ml-auto">
          {total !== undefined && (
            <span className="text-cedar-muted text-xs font-mono tabular-nums whitespace-nowrap">
              {total.toLocaleString("en-US")} results
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={() => onChange({ sort: "newest", page: 1 })}
              className="inline-flex items-center gap-1 text-cedar-muted text-xs hover:text-cedar-text transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-cedar-muted text-xs font-sans tracking-widest uppercase w-16 shrink-0">Category</span>
        <PillGroup
          options={CATEGORIES}
          value={(filters.category ?? "") as Category | ""}
          onSelect={(v) => set({ category: v || undefined })}
        />
      </div>
    </div>
  );
}
