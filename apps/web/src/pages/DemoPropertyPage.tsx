import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Waves,
  Dumbbell,
  Shield,
  Car,
  Wifi,
  Wind,
  WashingMachine,
} from "lucide-react";

const PHOTOS = [
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
];

const PHOTO_LABELS = [
  "Living room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Balcony view",
  "Building exterior",
];

const AMENITIES = [
  { label: "Pool", icon: <Waves size={16} /> },
  { label: "Gym", icon: <Dumbbell size={16} /> },
  { label: "Concierge", icon: <Shield size={16} /> },
  { label: "Beach Access", icon: <Waves size={16} /> },
  { label: "Parking", icon: <Car size={16} /> },
  { label: "Washer/Dryer", icon: <WashingMachine size={16} /> },
  { label: "AC", icon: <Wind size={16} /> },
  { label: "WiFi", icon: <Wifi size={16} /> },
];

const KEYS = [
  {
    id: "key-1",
    dateRange: "Jan 1 – Jun 30, 2027",
    priceUsdc: "18,000",
    perMonth: "~$3,000/mo",
  },
  {
    id: "key-2",
    dateRange: "Jul 1 – Dec 31, 2027",
    priceUsdc: "19,500",
    perMonth: "~$3,250/mo",
  },
  {
    id: "key-3",
    dateRange: "Jan 1 – Jun 30, 2028",
    priceUsdc: "17,200",
    perMonth: "~$2,867/mo",
  },
];

export function DemoPropertyPage() {
  const [current, setCurrent] = useState(0);

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-relay-secondary hover:text-relay-text transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to browse
      </Link>

      {/* Photo Gallery */}
      <div className="relative w-full aspect-[16/9] sm:max-h-[500px] -mx-4 sm:mx-0 sm:rounded-xl overflow-hidden bg-relay-elevated">
        <img
          src={PHOTOS[current]}
          alt={PHOTO_LABELS[current]}
          className="w-full h-full object-cover"
        />
        <button
          onClick={() =>
            setCurrent((c) => (c - 1 + PHOTOS.length) % PHOTOS.length)
          }
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setCurrent((c) => (c + 1) % PHOTOS.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <ChevronRight size={20} />
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {PHOTOS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? "bg-[#C9A96E]" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <h1 className="text-page-title text-relay-text">Tiffany House</h1>
            <p className="text-lg text-relay-secondary mt-1 flex items-center gap-1.5">
              <MapPin size={16} />
              Fort Lauderdale Beach, FL
            </p>
          </div>

          {/* Unit details */}
          <div className="flex flex-wrap items-center gap-6 text-relay-secondary">
            <span className="flex items-center gap-2">
              <Bed size={18} /> 1 Bed
            </span>
            <span className="flex items-center gap-2">
              <Bath size={18} /> 1 Bath
            </span>
            <span className="flex items-center gap-2">
              <Maximize2 size={18} /> 650 sqft
            </span>
            <span className="text-sm">Floor 12</span>
            <span className="badge badge-active">Furnished</span>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-section-header text-relay-text mb-3">About</h2>
            <p className="text-relay-secondary leading-relaxed">
              Fully furnished ocean-view unit on the 12th floor of Tiffany
              House, one of Fort Lauderdale Beach's most sought-after buildings.
              Floor-to-ceiling windows, modern finishes, and a private balcony
              overlooking the Atlantic. Walk to the beach in under 2 minutes.
            </p>
          </div>

          {/* Amenities */}
          <div>
            <h2 className="text-section-header text-relay-text mb-4">
              Building Amenities
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AMENITIES.map((amenity) => (
                <div
                  key={amenity.label}
                  className="flex items-center gap-2.5 text-sm text-relay-secondary bg-relay-subtle rounded-lg px-4 py-3"
                >
                  {amenity.icon}
                  <span>{amenity.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map placeholder */}
          <div>
            <h2 className="text-section-header text-relay-text mb-4">
              Location
            </h2>
            <div className="rounded-xl overflow-hidden h-48 sm:h-56">
              <iframe
                title="Tiffany House location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3582.!2d-80.1048!3d26.1195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d901a2e3b0c3a1%3A0x0!2sFort+Lauderdale+Beach%2C+FL!5e0!3m2!1sen!2sus!4v1"
                width="100%"
                height="100%"
                style={{ border: 0, filter: "invert(90%) hue-rotate(180deg) brightness(0.95) contrast(0.9)" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        {/* Right column — sticky */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24 space-y-4">
            <h2 className="text-section-header text-relay-text mb-2">
              Available Keys
            </h2>

            {KEYS.map((key) => (
              <div
                key={key.id}
                className="bg-relay-subtle border border-relay-border rounded-xl p-4 sm:p-5"
              >
                <div className="text-base text-relay-text font-medium mb-3">
                  {key.dateRange}
                </div>
                <div className="price text-2xl text-relay-text mb-1">
                  ${key.priceUsdc} USDC
                </div>
                <div className="font-mono text-xs text-relay-muted mb-4">
                  {key.perMonth}
                </div>
                <button className="btn-primary w-full">Buy Key</button>
              </div>
            ))}

            <div className="mt-6 space-y-2 text-xs text-relay-muted">
              <p>Occupancy requires ID verification + background check</p>
              <p>10% refundable deposit at redemption</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
