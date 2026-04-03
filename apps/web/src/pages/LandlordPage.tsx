import { useState } from "react";
import {
  DollarSign,
  Clock,
  Shield,
  Users,
  ArrowRight,
  Check,
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
    desc: "Each occupancy period becomes a Key—a digital right to live in the unit for that timeframe.",
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

      {/* Economics comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        <div className="bg-relay-elevated border border-relay-border rounded-2xl p-8">
          <h3 className="text-sm font-medium text-relay-muted uppercase tracking-wider mb-6">
            Traditional Rental
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-relay-muted" />
              <span className="text-relay-secondary">Monthly rent collection</span>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign size={18} className="text-relay-muted" />
              <span className="text-relay-secondary">
                $3,000/mo &times; 12 = $36,000/yr
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users size={18} className="text-relay-muted" />
              <span className="text-relay-secondary">Vacancy risk each turnover</span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-relay-border">
            <div className="text-sm text-relay-muted">Annual Revenue</div>
            <div className="price text-2xl text-relay-text mt-1">$36,000</div>
            <div className="text-xs text-relay-muted mt-1">
              Collected monthly, minus vacancy
            </div>
          </div>
        </div>

        <div className="bg-relay-elevated border border-relay-teal/30 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-relay-teal text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
            RelayX
          </div>
          <h3 className="text-sm font-medium text-relay-teal uppercase tracking-wider mb-6">
            RelayX Pre-Sale
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <DollarSign size={18} className="text-relay-teal" />
              <span className="text-relay-text">Lump sum upfront</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-relay-teal" />
              <span className="text-relay-text">
                $18,000 per 6-month Key &times; 4 = $72,000
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Check size={18} className="text-relay-teal" />
              <span className="text-relay-text">Zero vacancy risk—sold upfront</span>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-relay-teal/20">
            <div className="text-sm text-relay-teal">2-Year Revenue (Upfront)</div>
            <div className="price text-2xl text-relay-teal mt-1">$72,000</div>
            <div className="text-xs text-relay-secondary mt-1">
              Time value of money: invest today, not in 24 months
            </div>
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
