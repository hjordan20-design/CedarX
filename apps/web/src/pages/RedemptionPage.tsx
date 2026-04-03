import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Upload,
  Shield,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { fetchKey } from "@/lib/api";
import { formatUSDC, formatDateRange } from "@/lib/formatters";

const STEPS = [
  { label: "Confirm", icon: Check },
  { label: "Identity", icon: Upload },
  { label: "Screening", icon: Shield },
  { label: "Deposit", icon: FileText },
  { label: "Agreement", icon: FileText },
  { label: "Complete", icon: Check },
];

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2 flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors ${
              i < current
                ? "bg-relay-teal text-white"
                : i === current
                ? "bg-relay-teal/20 text-relay-teal border border-relay-teal"
                : "bg-relay-subtle text-relay-muted border border-relay-border"
            }`}
          >
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-0.5 flex-1 rounded ${
                i < current ? "bg-relay-teal" : "bg-relay-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function RedemptionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const { data: keyData, isLoading } = useQuery({
    queryKey: ["key", id],
    queryFn: () => fetchKey(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-relay-teal" size={32} />
      </div>
    );
  }

  if (!keyData) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-relay-secondary">Key not found.</p>
        <Link to="/my-keys" className="text-relay-teal mt-4 inline-block">
          Back to My Keys
        </Link>
      </div>
    );
  }

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link
        to="/my-keys"
        className="inline-flex items-center gap-1.5 text-sm text-relay-secondary hover:text-relay-text transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Back to My Keys
      </Link>

      <h1 className="text-page-title text-relay-text mb-2">Redeem Key</h1>
      <p className="text-relay-secondary mb-8">
        {keyData.property?.buildingName} — Unit {keyData.unit}
      </p>

      <ProgressBar current={step} />

      {/* Step content */}
      <div className="bg-relay-elevated border border-relay-border rounded-2xl p-8">
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-section-header text-relay-text">
              Confirm Redemption
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-relay-secondary">Property</span>
                <span className="text-relay-text">
                  {keyData.property?.buildingName}
                </span>
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
            </div>
            <div className="bg-relay-subtle rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-relay-warning shrink-0 mt-0.5" />
              <p className="text-sm text-relay-secondary">
                Once redeemed, this Key cannot be sold or transferred. This action is permanent.
              </p>
            </div>
            <button onClick={next} className="btn-primary w-full">
              Confirm &amp; Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-section-header text-relay-text">
              Identity Verification
            </h2>
            <p className="text-relay-secondary">
              Upload a clear photo of your government-issued ID (passport, driver's license, or national ID card).
            </p>
            <div className="border-2 border-dashed border-relay-border rounded-xl p-12 text-center hover:border-relay-teal/30 transition-colors cursor-pointer">
              <Upload size={32} className="mx-auto text-relay-muted mb-3" />
              <p className="text-sm text-relay-secondary">
                Drag &amp; drop or click to upload
              </p>
              <p className="text-xs text-relay-muted mt-1">
                PDF, JPG, or PNG up to 10MB
              </p>
            </div>
            <button onClick={next} className="btn-primary w-full">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-section-header text-relay-text">
              Background Check
            </h2>
            <p className="text-relay-secondary">
              Authorize a background and credit check. The screening fee is $250, payable in USDC.
            </p>
            <div className="bg-relay-subtle rounded-xl p-5 flex justify-between items-center">
              <span className="text-relay-secondary">Screening Fee</span>
              <span className="price text-xl text-relay-text">$250 USDC</span>
            </div>
            <button onClick={next} className="btn-primary w-full">
              Authorize &amp; Pay $250 USDC
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-section-header text-relay-text">
              Damage Deposit
            </h2>
            <p className="text-relay-secondary">
              A refundable damage deposit of 10% of the Key price is required. This is held in smart contract escrow and returned after move-out inspection.
            </p>
            <div className="bg-relay-subtle rounded-xl p-5 flex justify-between items-center">
              <span className="text-relay-secondary">Deposit Amount</span>
              <span className="price text-xl text-relay-text">
                {formatUSDC(keyData.priceUsdc * 0.1)}
              </span>
            </div>
            <button onClick={next} className="btn-primary w-full">
              Pay Deposit
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-section-header text-relay-text">
              Sign Agreement
            </h2>
            <p className="text-relay-secondary">
              Review and sign the triparty occupancy agreement. This document outlines the terms of your stay, house rules, and responsibilities.
            </p>
            <div className="bg-relay-subtle rounded-xl p-8 text-center">
              <FileText size={48} className="mx-auto text-relay-muted mb-3" />
              <p className="text-sm text-relay-muted">
                Document signing will open in a new window
              </p>
            </div>
            <button onClick={next} className="btn-primary w-full">
              Sign Agreement
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-relay-teal/20 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} className="text-relay-teal" />
            </div>
            <h2 className="text-section-header text-relay-text">
              You're all set
            </h2>
            <p className="text-relay-secondary max-w-md mx-auto">
              Your Key has been redeemed. Move-in details will be sent to your email within 48 hours. Your property manager will reach out with building access instructions.
            </p>
            <div className="bg-relay-subtle rounded-xl p-5 space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-relay-secondary">Move-in Date</span>
                <span className="text-relay-text">
                  {keyData.startDate}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-relay-secondary">Move-out Date</span>
                <span className="text-relay-text">
                  {keyData.endDate}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate("/my-keys")}
              className="btn-primary"
            >
              Back to My Keys
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
