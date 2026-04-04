import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  Key as KeyIcon,
  ExternalLink,
  Tag,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { fetchKeys } from "@/lib/api";
import { formatUSDC, formatDateRange, truncateAddress, monthsBetween, formatPerMonth } from "@/lib/formatters";
import type { Key, KeyStatus } from "@/lib/types";

const STATUS_BADGES: Record<KeyStatus, { class: string; label: string }> = {
  tradeable: { class: "badge-tradeable", label: "Tradeable" },
  redeemed: { class: "badge-redeemed", label: "Redeemed" },
  active: { class: "badge-active", label: "Active" },
  expired: { class: "badge-expired", label: "Expired" },
};

function KeyDetailModal({
  keyData,
  onClose,
}: {
  keyData: Key;
  onClose: () => void;
}) {
  const badge = STATUS_BADGES[keyData.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-relay-elevated border border-relay-border rounded-2xl p-8 max-w-lg w-full mx-4 animate-fade-up">
        {/* Property photo */}
        {keyData.property?.photos?.[0] && (
          <div className="aspect-[16/9] rounded-xl overflow-hidden mb-6">
            <img
              src={keyData.property.photos[0]}
              alt={keyData.property.buildingName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-section-header text-relay-text">
              {keyData.property?.buildingName ?? "Property"}
            </h3>
            {keyData.property?.neighborhood && (
              <p className="text-sm text-relay-secondary">
                {keyData.property.neighborhood}, {keyData.property.city}
              </p>
            )}
          </div>
          <span className={`badge ${badge.class}`}>{badge.label}</span>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-relay-secondary">Unit</span>
            <span className="text-relay-text">{keyData.unit}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-relay-secondary">Period</span>
            <span className="text-relay-text">
              {formatDateRange(keyData.startDate, keyData.endDate)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-relay-secondary">Purchase Price</span>
            <div className="text-right">
              <span className="price text-relay-text">
                {formatUSDC(keyData.priceUsdc)}
              </span>
              {keyData.startDate && keyData.endDate && (
                <div className="font-mono text-[11px] text-relay-muted mt-0.5">
                  {formatPerMonth(Number(keyData.priceUsdc), monthsBetween(keyData.startDate, keyData.endDate))}
                </div>
              )}
            </div>
          </div>
          {keyData.tokenId !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-relay-secondary">Token ID</span>
              <span className="font-mono text-relay-text">#{keyData.tokenId}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {keyData.status === "tradeable" && (
            <button className="btn-primary w-full">
              <Tag size={16} /> List for Sale
            </button>
          )}
          {keyData.status === "tradeable" && (
            <Link
              to={`/redeem/${keyData.id}`}
              className="btn-secondary w-full text-center"
              onClick={onClose}
            >
              Redeem Key
            </Link>
          )}
          {keyData.tokenId !== null && (
            <a
              href={`https://etherscan.io/token/${keyData.tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-sm text-relay-muted hover:text-relay-secondary transition-colors mt-2"
            >
              View on Etherscan <ExternalLink size={12} />
            </a>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-relay-muted hover:text-relay-text transition-colors"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export function MyKeysPage() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-keys", address],
    queryFn: () => fetchKeys({ ownerWallet: address }),
    enabled: !!address,
  });

  if (!address) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-24 text-center">
        <KeyIcon size={48} className="mx-auto text-relay-muted mb-4" />
        <h2 className="text-section-header text-relay-text mb-2">
          Connect your wallet
        </h2>
        <p className="text-relay-secondary mb-6">
          Connect your wallet to view your Keys.
        </p>
        <button onClick={openConnectModal} className="btn-primary">
          Connect Wallet
        </button>
      </div>
    );
  }

  const keys = data?.data ?? [];

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-page-title text-relay-text mb-8">My Keys</h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-relay-gold" size={32} />
        </div>
      ) : keys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {keys.map((key) => {
            const badge = STATUS_BADGES[key.status];
            return (
              <button
                key={key.id}
                onClick={() => setSelectedKey(key)}
                className={`card text-left ${
                  key.status === "expired" ? "opacity-50" : ""
                }`}
              >
                {/* Photo */}
                {key.property?.photos?.[0] ? (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={key.property.photos[0]}
                      alt={key.property.buildingName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-relay-subtle flex items-center justify-center">
                    <KeyIcon size={32} className="text-relay-muted" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-card-title text-relay-text truncate">
                      {key.property?.buildingName ?? "Property"}
                    </h3>
                    <span className={`badge ${badge.class} shrink-0 ml-2`}>
                      {badge.label}
                    </span>
                  </div>
                  {key.property?.neighborhood && (
                    <p className="text-sm text-relay-secondary">
                      {key.property.neighborhood}
                    </p>
                  )}
                  <p className="text-sm text-relay-secondary mt-2">
                    {formatDateRange(key.startDate, key.endDate)}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <span className="price text-relay-text">
                        {formatUSDC(key.priceUsdc)}
                      </span>
                      {key.startDate && key.endDate && (
                        <div className="font-mono text-[11px] text-relay-muted mt-0.5">
                          {formatPerMonth(Number(key.priceUsdc), monthsBetween(key.startDate, key.endDate))}
                        </div>
                      )}
                    </div>
                    <ArrowRight size={16} className="text-relay-muted" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <KeyIcon size={48} className="mx-auto text-relay-muted mb-4" />
          <h2 className="text-section-header text-relay-text mb-2">
            No Keys yet
          </h2>
          <p className="text-relay-secondary mb-6">
            You don't own any Keys yet. Browse available properties.
          </p>
          <Link to="/" className="btn-primary inline-flex">
            Browse Properties
          </Link>
        </div>
      )}

      {/* Key detail modal */}
      {selectedKey && (
        <KeyDetailModal
          keyData={selectedKey}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  );
}
