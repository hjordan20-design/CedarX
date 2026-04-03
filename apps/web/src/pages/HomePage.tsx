import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown, Bed, Bath, Maximize2 } from "lucide-react";
import { fetchProperties } from "@/lib/api";
import { formatUSDC } from "@/lib/formatters";
import type { PropertyFilters } from "@/lib/types";

const CITIES = ["All", "Fort Lauderdale", "Miami"];
const DURATIONS = ["All", "1mo", "3mo", "6mo"];

function PropertyCard({ property }: { property: {
  id: string;
  buildingName: string;
  neighborhood: string | null;
  city: string;
  beds: number;
  baths: number;
  sqft: number;
  photos: string[];
  keysAvailable?: number;
  minPrice?: number;
} }) {
  const photo = property.photos?.[0];

  return (
    <Link to={`/properties/${property.id}`} className="card group block">
      {/* Photo */}
      <div className="relative aspect-[16/10] overflow-hidden bg-relay-subtle">
        {photo ? (
          <img
            src={photo}
            alt={property.buildingName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-relay-muted text-sm">No photo</div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="text-card-title text-relay-text truncate">
          {property.buildingName}
        </h3>
        {property.neighborhood && (
          <p className="text-sm text-relay-secondary mt-0.5">
            {property.neighborhood} — {property.city}
          </p>
        )}

        <div className="flex items-center gap-4 mt-3 text-sm text-relay-secondary">
          <span className="flex items-center gap-1">
            <Bed size={14} /> {property.beds} Bed
          </span>
          <span className="flex items-center gap-1">
            <Bath size={14} /> {property.baths} Bath
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 size={14} /> {property.sqft.toLocaleString()} sqft
          </span>
        </div>

        <div className="flex items-center justify-between mt-4">
          {property.minPrice ? (
            <span className="price text-relay-teal text-base">
              Keys from {formatUSDC(property.minPrice)}
            </span>
          ) : (
            <span className="text-sm text-relay-muted">No keys available</span>
          )}
          {property.keysAvailable !== undefined && property.keysAvailable > 0 && (
            <span className="text-xs text-relay-secondary">
              {property.keysAvailable} period{property.keysAvailable !== 1 ? "s" : ""} available
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const [city, setCity] = useState("All");
  const [duration, setDuration] = useState("All");
  const [search, setSearch] = useState("");

  const filters: PropertyFilters = {
    ...(city !== "All" ? { city } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["properties", filters],
    queryFn: () => fetchProperties(filters),
  });

  const properties = data?.data ?? [];

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Search — hidden on mobile */}
        <div className="relative flex-1 max-w-sm hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-relay-muted" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-relay-elevated border border-relay-border rounded-lg text-sm text-relay-text placeholder-relay-muted focus:outline-none focus:border-relay-teal transition-colors"
          />
        </div>

        {/* City dropdown */}
        <div className="relative">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="appearance-none bg-relay-elevated border border-relay-border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 pr-7 sm:pr-8 text-xs sm:text-sm text-relay-text focus:outline-none focus:border-relay-teal transition-colors cursor-pointer"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All Cities" : c}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-relay-muted pointer-events-none" />
        </div>

        {/* Duration */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-relay-elevated border border-relay-border rounded-lg p-0.5 sm:p-1">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors ${
                duration === d
                  ? "bg-relay-teal text-white"
                  : "text-relay-secondary hover:text-relay-text"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Property grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-[16/10] bg-relay-subtle" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-relay-subtle rounded w-3/4" />
                <div className="h-4 bg-relay-subtle rounded w-1/2" />
                <div className="h-4 bg-relay-subtle rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties
            .filter((p) =>
              search
                ? p.buildingName.toLowerCase().includes(search.toLowerCase()) ||
                  (p.neighborhood?.toLowerCase().includes(search.toLowerCase()) ?? false)
                : true
            )
            .map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
        </div>
      ) : (
        /* Empty state — aspirational waitlist hero */
        <div className="relative rounded-2xl overflow-hidden mt-6 sm:mt-8 -mx-4 sm:mx-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1920&q=85')" }}
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
          <div className="relative z-20 flex flex-col items-center justify-center py-28 sm:py-40 md:py-52 px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-[48px] md:text-[56px] font-bold text-white mb-4 sm:mb-5 tracking-tight leading-tight">
              Properties coming soon
            </h2>
            <p className="text-white/75 text-base sm:text-lg md:text-xl max-w-lg mb-8 sm:mb-10 leading-relaxed">
              Furnished rentals in Fort Lauderdale and Miami.{" "}
              <br className="hidden md:block" />
              Join the waitlist for early access to Keys.
            </p>
            <form
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-md"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full sm:flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-5 py-3.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-relay-teal transition-colors"
              />
              <button type="submit" className="btn-primary w-full sm:w-auto whitespace-nowrap px-8 py-3.5">
                Join Waitlist
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
