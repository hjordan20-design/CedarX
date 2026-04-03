import { useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQuery } from "@tanstack/react-query";
import {
  Key as KeyIcon,
  DollarSign,
  Loader2,
  Wallet,
  Tag,
} from "lucide-react";
import { fetchKeys, createListing } from "@/lib/api";
import { formatUSDC, formatDateRange } from "@/lib/formatters";
import type { Key } from "@/lib/types";

export function SellPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const [price, setPrice] = useState("");
  const [listing, setListing] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-tradeable-keys", address],
    queryFn: () => fetchKeys({ ownerWallet: address, status: "tradeable" }),
    enabled: !!address,
  });

  const keys = data?.data ?? [];

  const handleList = async () => {
    if (!selectedKey || !price || !address) return;
    setListing(true);
    try {
      await createListing({
        keyId: selectedKey.id,
        sellerWallet: address,
        askingPriceUsdc: parseFloat(price),
      });
      setSuccess(true);
    } finally {
      setListing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-24 text-center">
        <Wallet size={48} className="mx-auto text-relay-muted mb-4" />
        <h2 className="text-section-header text-relay-text mb-2">
          Connect your wallet
        </h2>
        <p className="text-relay-secondary mb-6">
          Connect your wallet to list your Keys for sale on the secondary market.
        </p>
        <button onClick={openConnectModal} className="btn-primary">
          Connect Wallet
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-24 text-center">
        <Tag size={48} className="mx-auto text-relay-gold mb-4" />
        <h2 className="text-section-header text-relay-text mb-2">
          Listed successfully
        </h2>
        <p className="text-relay-secondary mb-6">
          Your Key is now available on the secondary market.
        </p>
        <button
          onClick={() => { setSuccess(false); setSelectedKey(null); setPrice(""); }}
          className="btn-primary"
        >
          List Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-page-title text-relay-text mb-2">List a Key</h1>
      <p className="text-relay-secondary mb-8">
        Select a Key from your wallet and set your asking price.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-relay-gold" size={32} />
        </div>
      ) : selectedKey ? (
        /* Pricing form */
        <div className="max-w-lg space-y-6">
          <div className="bg-relay-elevated border border-relay-border rounded-xl p-5 flex items-center gap-4">
            {selectedKey.property?.photos?.[0] && (
              <img
                src={selectedKey.property.photos[0]}
                alt=""
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            )}
            <div>
              <p className="text-relay-text font-medium">
                {selectedKey.property?.buildingName ?? "Property"} — Unit {selectedKey.unit}
              </p>
              <p className="text-sm text-relay-secondary">
                {formatDateRange(selectedKey.startDate, selectedKey.endDate)}
              </p>
              <p className="text-sm text-relay-muted mt-1">
                Mint price: {formatUSDC(selectedKey.priceUsdc)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-relay-secondary">Asking Price (USDC)</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-relay-muted" />
              <input
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-relay-subtle border border-relay-border rounded-lg pl-9 pr-4 py-3 font-mono text-relay-text focus:outline-none focus:border-relay-gold transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSelectedKey(null)}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              onClick={handleList}
              disabled={!price || parseFloat(price) <= 0 || listing}
              className="btn-primary flex-1"
            >
              {listing ? (
                <><Loader2 size={14} className="animate-spin" /> Listing...</>
              ) : (
                "List for Sale"
              )}
            </button>
          </div>
        </div>
      ) : keys.length > 0 ? (
        /* Key picker */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {keys.map((key) => (
            <button
              key={key.id}
              onClick={() => setSelectedKey(key)}
              className="card text-left p-5 hover:border-relay-gold/30"
            >
              <h3 className="text-card-title text-relay-text">
                {key.property?.buildingName ?? "Property"}
              </h3>
              <p className="text-sm text-relay-secondary">
                Unit {key.unit}
              </p>
              <p className="text-sm text-relay-secondary mt-1">
                {formatDateRange(key.startDate, key.endDate)}
              </p>
              <p className="price text-relay-gold mt-2">
                {formatUSDC(key.priceUsdc)}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <KeyIcon size={48} className="mx-auto text-relay-muted mb-4" />
          <p className="text-relay-secondary">
            You don't have any tradeable Keys to list.
          </p>
        </div>
      )}
    </div>
  );
}
