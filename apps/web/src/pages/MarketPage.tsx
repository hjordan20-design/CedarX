import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUpDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { fetchListings } from "@/lib/api";
import { formatUSDC, formatDateRange, timeAgo, truncateAddress } from "@/lib/formatters";

type SortKey = "price_asc" | "price_desc" | "newest";

export function MarketPage() {
  const [sort, setSort] = useState<SortKey>("newest");

  const { data, isLoading } = useQuery({
    queryKey: ["listings", sort],
    queryFn: () => fetchListings({ status: "active" }),
  });

  const listings = data?.data ?? [];

  // Client-side sort
  const sorted = [...listings].sort((a, b) => {
    if (sort === "price_asc") return a.askingPriceUsdc - b.askingPriceUsdc;
    if (sort === "price_desc") return b.askingPriceUsdc - a.askingPriceUsdc;
    return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
  });

  return (
    <div className="max-w-content mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left panel — listings (65%) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-page-title text-relay-text">Secondary Market</h1>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-relay-muted" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-relay-elevated border border-relay-border rounded-lg px-3 py-2 text-sm text-relay-text focus:outline-none focus:border-relay-gold cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-relay-gold" size={32} />
            </div>
          ) : sorted.length > 0 ? (
            <div className="space-y-3">
              {sorted.map((listing) => {
                const key = listing.key;
                const property = key?.property;
                return (
                  <div
                    key={listing.id}
                    className="bg-relay-elevated border border-relay-border rounded-xl p-4 flex items-center gap-4 hover:border-relay-gold/30 transition-colors"
                  >
                    {/* Thumbnail */}
                    {property?.photos?.[0] ? (
                      <img
                        src={property.photos[0]}
                        alt={property.buildingName}
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-relay-subtle shrink-0" />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-relay-text truncate">
                          {property?.buildingName ?? "Property"}{" "}
                          {key?.unit && (
                            <span className="text-relay-secondary font-normal">
                              Unit {key.unit}
                            </span>
                          )}
                        </h3>
                      </div>
                      {key && (
                        <p className="text-xs text-relay-secondary mt-0.5">
                          {formatDateRange(key.startDate, key.endDate)}
                        </p>
                      )}
                      <p className="text-xs text-relay-muted mt-1">
                        Seller: {truncateAddress(listing.sellerWallet)}
                      </p>
                    </div>

                    {/* Mint price (muted) */}
                    {key && (
                      <div className="text-right shrink-0 hidden sm:block">
                        <div className="text-xs text-relay-muted">Mint price</div>
                        <div className="text-xs font-mono text-relay-muted">
                          {formatUSDC(key.priceUsdc)}
                        </div>
                      </div>
                    )}

                    {/* Asking price */}
                    <div className="text-right shrink-0">
                      <div className="price text-lg text-relay-gold">
                        {formatUSDC(listing.askingPriceUsdc)}
                      </div>
                    </div>

                    {/* Buy button */}
                    <button className="btn-primary px-4 py-2 text-sm shrink-0">
                      Buy
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-relay-elevated rounded-xl border border-relay-border">
              <TrendingUp size={48} className="mx-auto text-relay-muted mb-4" />
              <h2 className="text-section-header text-relay-text mb-2">
                No listings yet
              </h2>
              <p className="text-relay-secondary">
                Secondary market listings will appear here once Key holders list their Keys for sale.
              </p>
            </div>
          )}
        </div>

        {/* Right panel — activity feed (35%) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <h2 className="text-section-header text-relay-text mb-4">Activity</h2>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-relay-elevated border border-relay-border rounded-xl p-4">
                <div className="text-xs text-relay-muted mb-1">Active Listings</div>
                <div className="price text-xl text-relay-text">
                  {sorted.length}
                </div>
              </div>
              <div className="bg-relay-elevated border border-relay-border rounded-xl p-4">
                <div className="text-xs text-relay-muted mb-1">Total Volume</div>
                <div className="price text-xl text-relay-text">$0</div>
              </div>
            </div>

            {/* Recent trades */}
            <h3 className="text-sm font-medium text-relay-secondary mb-3">
              Recent Trades
            </h3>
            <div className="space-y-2">
              {/* Placeholder — will populate when trades happen */}
              <div className="bg-relay-subtle rounded-lg p-4 text-center">
                <p className="text-sm text-relay-muted">No trades yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
