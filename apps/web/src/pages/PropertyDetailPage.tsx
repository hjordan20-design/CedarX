import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Dumbbell,
  Car,
  Waves,
  Shield,
  Wifi,
  Loader2,
} from "lucide-react";
import { fetchProperty } from "@/lib/api";
import { formatUSDC, formatDateRange } from "@/lib/formatters";
import type { Key } from "@/lib/types";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  pool: <Waves size={16} />,
  gym: <Dumbbell size={16} />,
  parking: <Car size={16} />,
  concierge: <Shield size={16} />,
  wifi: <Wifi size={16} />,
};

function PhotoGallery({ photos }: { photos: string[] }) {
  const [current, setCurrent] = useState(0);

  if (!photos.length) {
    return (
      <div className="w-full aspect-[16/9] bg-relay-elevated rounded-xl flex items-center justify-center">
        <span className="text-relay-muted">No photos available</span>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-relay-elevated group">
      <img
        src={photos[current]}
        alt={`Property photo ${current + 1}`}
        className="w-full h-full object-cover"
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + photos.length) % photos.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % photos.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function KeyCard({
  keyData,
  onBuy,
}: {
  keyData: Key;
  onBuy: (key: Key) => void;
}) {
  return (
    <div className="bg-relay-subtle border border-relay-border rounded-xl p-5">
      <div className="text-sm text-relay-secondary mb-1">
        Unit {keyData.unit}
      </div>
      <div className="text-base text-relay-text font-medium mb-3">
        {formatDateRange(keyData.startDate, keyData.endDate)}
      </div>
      <div className="price text-2xl text-relay-text mb-4">
        {formatUSDC(keyData.priceUsdc)}
      </div>
      <button
        onClick={() => onBuy(keyData)}
        className="btn-primary w-full"
      >
        Buy Key
      </button>
    </div>
  );
}

function PurchaseModal({
  keyData,
  propertyName,
  onClose,
  onConfirm,
}: {
  keyData: Key;
  propertyName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-relay-elevated border border-relay-border rounded-2xl p-8 max-w-md w-full mx-4 animate-fade-up">
        <h3 className="text-section-header text-relay-text mb-6">
          Confirm Purchase
        </h3>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-relay-secondary">Property</span>
            <span className="text-relay-text">{propertyName}</span>
          </div>
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
          <div className="border-t border-relay-border pt-4 flex justify-between">
            <span className="text-relay-secondary font-medium">Total</span>
            <span className="price text-xl text-relay-gold">
              {formatUSDC(keyData.priceUsdc)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-primary flex-1">
            Confirm Purchase
          </button>
        </div>
      </div>
    </div>
  );
}

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["property", id],
    queryFn: () => fetchProperty(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-relay-gold" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-relay-secondary">Property not found.</p>
        <Link to="/" className="text-relay-gold hover:text-relay-gold-lt mt-4 inline-block">
          Back to browse
        </Link>
      </div>
    );
  }

  const property = data;
  const availableKeys = (property.keys ?? []).filter(
    (k) => k.status === "tradeable" && !k.ownerWallet
  );
  const amenities = property.amenities ?? [];

  const handleBuy = (key: Key) => {
    if (!address) {
      openConnectModal?.();
      return;
    }
    setSelectedKey(key);
  };

  const handleConfirm = () => {
    // TODO: Execute onchain mint transaction
    setSelectedKey(null);
    navigate("/my-keys");
  };

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-relay-secondary hover:text-relay-text transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to browse
      </Link>

      {/* Photo gallery */}
      <PhotoGallery photos={property.photos ?? []} />

      {/* Two-column layout */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Left column (60%) */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <h1 className="text-page-title text-relay-text">
              {property.buildingName}
            </h1>
            {property.neighborhood && (
              <p className="text-lg text-relay-secondary mt-1 flex items-center gap-1.5">
                <MapPin size={16} />
                {property.neighborhood}, {property.city}, {property.state}
              </p>
            )}
          </div>

          {/* Unit details */}
          <div className="flex items-center gap-6 text-relay-secondary">
            <span className="flex items-center gap-2">
              <Bed size={18} /> {property.beds} Bed{property.beds !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-2">
              <Bath size={18} /> {property.baths} Bath{property.baths !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-2">
              <Maximize2 size={18} /> {property.sqft.toLocaleString()} sqft
            </span>
            {property.floor && (
              <span className="text-sm">Floor {property.floor}</span>
            )}
            <span className="badge badge-active">Furnished</span>
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h2 className="text-section-header text-relay-text mb-3">About</h2>
              <p className="text-relay-secondary leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div>
              <h2 className="text-section-header text-relay-text mb-4">
                Building Amenities
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2.5 text-sm text-relay-secondary bg-relay-subtle rounded-lg px-4 py-3"
                  >
                    {AMENITY_ICONS[amenity.toLowerCase()] ?? (
                      <div className="w-4 h-4 rounded-full bg-relay-gold/20" />
                    )}
                    <span className="capitalize">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column (40%) — sticky */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24 space-y-4">
            <h2 className="text-section-header text-relay-text mb-2">
              Available Keys
            </h2>

            {availableKeys.length > 0 ? (
              availableKeys.map((key) => (
                <KeyCard key={key.id} keyData={key} onBuy={handleBuy} />
              ))
            ) : (
              <div className="bg-relay-subtle border border-relay-border rounded-xl p-6 text-center">
                <p className="text-relay-secondary">
                  No keys currently available for this property.
                </p>
              </div>
            )}

            <div className="mt-6 space-y-2 text-xs text-relay-muted">
              <p>Occupancy requires ID verification + background check</p>
              <p>10% refundable deposit at redemption</p>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase modal */}
      {selectedKey && (
        <PurchaseModal
          keyData={selectedKey}
          propertyName={property.buildingName}
          onClose={() => setSelectedKey(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
