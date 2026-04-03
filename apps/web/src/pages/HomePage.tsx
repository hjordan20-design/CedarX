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
    <div className="max-w-content mx-auto px-6 py-8">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
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
            className="appearance-none bg-relay-elevated border border-relay-border rounded-lg px-4 py-2.5 pr-8 text-sm text-relay-text focus:outline-none focus:border-relay-teal transition-colors cursor-pointer"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All Cities" : c}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-relay-muted pointer-events-none" />
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 bg-relay-elevated border border-relay-border rounded-lg p-1">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
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
        /* Empty state — waitlist */
        <div className="relative rounded-2xl overflow-hidden mt-8">
          <div className="absolute inset-0 bg-gradient-to-b from-relay-bg/60 to-relay-bg/95 z-10" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1400&q=80')] bg-cover bg-center opacity-30" />
          <div className="relative z-20 flex flex-col items-center justify-center py-24 px-6 text-center">
            <h2 className="text-page-title text-relay-text mb-3">
              Properties coming soon
            </h2>
            <p className="text-relay-secondary text-base max-w-md mb-8">
              Furnished rentals in Fort Lauderdale and Miami. Join the waitlist to get early access to Keys.
            </p>
            <form
              className="flex items-center gap-2 w-full max-w-sm"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-relay-elevated border border-relay-border rounded-lg px-4 py-3 text-sm text-relay-text placeholder-relay-muted focus:outline-none focus:border-relay-teal transition-colors"
              />
              <button type="submit" className="btn-primary whitespace-nowrap">
                Join Waitlist
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
