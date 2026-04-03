import { useState } from "react";
import {
  Clock,
  Shield,
  Users,
  ArrowRight,
  Check,
  X,
  DollarSign,
  AlertTriangle,
  Zap,
} from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "List your property",
    desc: "Provide unit details, photos, and available occupancy periods. We handle the rest.",
  },
  {
    num: "02",
    title: "We mint Keys",
    desc: "Each occupancy period becomes a Key — a digital right to live in the unit for that timeframe.",
  },
  {
    num: "03",
    title: "Buyers purchase Keys",
    desc: "Buyers browse and purchase Keys with USDC. Funds settle directly to your wallet.",
  },
  {
    num: "04",
    title: "PM handles occupancy",
    desc: "Your property manager screens tenants, collects deposits, and manages the stay.",
  },
];

export function LandlordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-content mx-auto px-6 py-16">
      {/* Header */}
      <div className="max-w-2xl mb-20">
        <h1 className="text-page-title text-relay-text mb-4">
          List your property on RelayX
        </h1>
        <p className="text-xl text-relay-secondary leading-relaxed">
          Get years of rent upfront. Your property manager handles everything.
        </p>
      </div>

      {/* Economics comparison — no dollar figures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        {/* Traditional */}
        <div className="bg-relay-elevated border border-relay-border rounded-2xl p-8">
          <h3 className="text-sm font-medium text-relay-muted uppercase tracking-wider mb-6">
            Traditional Rental
          </h3>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-relay-muted mt-0.5 shrink-0" />
              <div>
                <span className="text-relay-secondary">Monthly collection</span>
                <p className="text-xs text-relay-muted mt-0.5">Chase payments every 30 days</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-relay-muted mt-0.5 shrink-0" />
              <div>
                <span className="text-relay-secondary">Vacancy risk</span>
                <p className="text-xs text-relay-muted mt-0.5">Empty units between turnovers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users size={18} className="text-relay-muted mt-0.5 shrink-0" />
              <div>
                <span className="text-relay-secondary">Late payment risk</span>
                <p className="text-xs text-relay-muted mt-0.5">Collections, evictions, legal costs</p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-relay-border flex items-center gap-2 text-relay-muted text-sm">
            <X size={16} className="text-red-400" />
            Revenue trickles in monthly
          </div>
        </div>

        {/* RelayX */}
        <div className="bg-relay-elevated border border-relay-teal/30 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-relay-teal text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
            RelayX
          </div>
          <h3 className="text-sm font-medium text-relay-teal uppercase tracking-wider mb-6">
            RelayX Pre-Sale
          </h3>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <DollarSign size={18} className="text-relay-teal mt-0.5 shrink-0" />
              <div>
                <span className="text-relay-text">Full payment upfront in USDC</span>
                <p className="text-xs text-relay-secondary mt-0.5">Funds settle to your wallet instantly</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-relay-teal mt-0.5 shrink-0" />
              <div>
                <span className="text-relay-text">Zero vacancy</span>
                <p className="text-xs text-relay-secondary mt-0.5">Every period is sold before it starts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap size={18} className="text-relay-teal mt-0.5 shrink-0" />
              <div>
                <span className="text-relay-text">No collections</span>
                <p className="text-xs text-relay-secondary mt-0.5">No chasing tenants — payment is done</p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-relay-teal/20 flex items-center gap-2 text-relay-teal text-sm font-medium">
            <Check size={16} />
            Revenue arrives all at once
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-20">
        <h2 className="text-section-header text-relay-text mb-10">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="bg-relay-elevated border border-relay-border rounded-xl p-6"
            >
              <div className="text-3xl font-bold text-relay-teal/30 mb-4">
                {step.num}
              </div>
              <h3 className="text-card-title text-relay-text mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-relay-secondary leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-relay-elevated border border-relay-border rounded-2xl p-10 text-center max-w-xl mx-auto">
        <h2 className="text-section-header text-relay-text mb-3">
          Get started
        </h2>
        <p className="text-relay-secondary mb-8">
          Drop your email and we'll send you an overview deck and schedule a call.
        </p>

        {submitted ? (
          <div className="flex items-center justify-center gap-2 text-relay-teal">
            <Check size={20} />
            <span>We'll be in touch shortly.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-sm mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-relay-subtle border border-relay-border rounded-lg px-4 py-3 text-sm text-relay-text placeholder-relay-muted focus:outline-none focus:border-relay-teal transition-colors"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Contact Us <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
