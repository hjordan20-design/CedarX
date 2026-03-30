import { useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, ChevronRight, ChevronLeft, FileText, DollarSign, ClipboardList } from "lucide-react";
import { fetchStates, postTokenizeRequest } from "@/lib/api";
import type { TokenizeRequest } from "@/lib/api";

// ─── Shared input/label styles ────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontFamily: "DM Sans, system-ui, sans-serif",
  fontSize: "15px",
  fontWeight: 300,
  border: "1px solid rgba(196,133,42,0.20)",
  borderBottom: "2px solid rgba(196,133,42,0.30)",
  background: "rgba(255,255,255,0.70)",
  color: "var(--cedar-text, #1C1710)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--cedar-muted)",
  fontFamily: "DM Sans, system-ui, sans-serif",
};

function Field({
  id, label, required, children,
}: { id?: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} style={labelStyle}>
        {label}{required && " *"}
      </label>
      {children}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: "Property details", icon: ClipboardList },
  { label: "Documents",        icon: FileText       },
  { label: "Pricing",          icon: DollarSign     },
  { label: "Review",           icon: CheckCircle    },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={s.label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: active
                    ? "2px solid #C4852A"
                    : done
                    ? "2px solid rgba(196,133,42,0.60)"
                    : "2px solid rgba(196,133,42,0.20)",
                  background: done ? "rgba(196,133,42,0.15)" : "transparent",
                  color: active ? "#C4852A" : done ? "rgba(196,133,42,0.70)" : "rgba(196,133,42,0.30)",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: active ? "#C4852A" : "rgba(28,23,16,0.35)",
                  fontFamily: "DM Sans, system-ui, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: done
                    ? "rgba(196,133,42,0.40)"
                    : "rgba(196,133,42,0.12)",
                  margin: "0 6px",
                  marginBottom: "18px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── US States list ───────────────────────────────────────────────────────────

const FALLBACK_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

// ─── Step 1: Property details ─────────────────────────────────────────────────

function Step1({
  form, set, states, onNext,
}: {
  form: TokenizeRequest;
  set: (p: Partial<TokenizeRequest>) => void;
  states: string[];
  onNext: () => void;
}) {
  const valid = !!form.address.trim() && !!form.state;
  return (
    <div className="space-y-5">
      <Field id="address" label="Street address" required>
        <input
          id="address"
          type="text"
          required
          placeholder="123 Main St"
          value={form.address}
          onChange={e => set({ address: e.target.value })}
          style={inputStyle}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field id="city" label="City">
          <input
            id="city"
            type="text"
            placeholder="e.g. Hartsel"
            value={form.city ?? ""}
            onChange={e => set({ city: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <Field id="state" label="State" required>
          <select
            id="state"
            required
            value={form.state}
            onChange={e => set({ state: e.target.value })}
            style={{ ...inputStyle, cursor: "pointer", color: form.state ? "var(--cedar-text, #1C1710)" : "var(--cedar-muted)" }}
          >
            <option value="">Select state</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id="county" label="County">
          <input
            id="county"
            type="text"
            placeholder="e.g. Chaffee County"
            value={form.county ?? ""}
            onChange={e => set({ county: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <Field id="parcel_id" label="Parcel ID / APN">
          <input
            id="parcel_id"
            type="text"
            placeholder="e.g. 123-456-789"
            value={form.parcel_id ?? ""}
            onChange={e => set({ parcel_id: e.target.value })}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field id="acreage" label="Acreage">
        <input
          id="acreage"
          type="number"
          min="0"
          step="any"
          placeholder="e.g. 5.00"
          value={form.acreage ?? ""}
          onChange={e => set({ acreage: e.target.value ? Number(e.target.value) : undefined })}
          style={inputStyle}
        />
      </Field>

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!valid}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "10px 24px",
            fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
            fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 400,
            color: valid ? "#C4852A" : "rgba(196,133,42,0.35)",
            background: "transparent",
            border: `1px solid ${valid ? "rgba(196,133,42,0.55)" : "rgba(196,133,42,0.20)"}`,
            cursor: valid ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Documents ────────────────────────────────────────────────────────

function Step2({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [files, setFiles] = useState<File[]>([]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles(prev => [...prev, ...selected]);
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-5">
      <p style={{ fontSize: "14px", fontWeight: 300, color: "var(--cedar-muted)", lineHeight: 1.7 }}>
        Attach copies of supporting documents. These help us verify ownership and process your
        request faster. All common formats accepted (PDF, JPG, PNG).
      </p>

      <div className="space-y-2">
        <p style={{ ...labelStyle, marginBottom: "4px" }}>Recommended documents</p>
        {["Recorded deed or title", "Proof of ownership (tax bill, title insurance)", "Survey or plat map (if available)"].map(doc => (
          <div key={doc} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(28,23,16,0.55)", fontFamily: "DM Sans, system-ui, sans-serif" }}>
            <span style={{ color: "rgba(196,133,42,0.50)" }}>·</span> {doc}
          </div>
        ))}
      </div>

      <div>
        <label
          htmlFor="docs-upload"
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "9px 20px",
            fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
            fontFamily: "DM Sans, system-ui, sans-serif",
            color: "#C4852A",
            border: "1px dashed rgba(196,133,42,0.40)",
            cursor: "pointer",
          }}
        >
          <FileText size={13} /> Attach files
        </label>
        <input
          id="docs-upload"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx"
          onChange={handleFiles}
          style={{ display: "none" }}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", color: "rgba(28,23,16,0.70)", fontFamily: "DM Sans, system-ui, sans-serif" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText size={12} style={{ color: "rgba(196,133,42,0.60)" }} />
                {f.name}
                <span style={{ color: "rgba(28,23,16,0.35)", fontSize: "11px" }}>({(f.size / 1024).toFixed(0)} KB)</span>
              </span>
              <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(28,23,16,0.40)", fontSize: "16px", lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: "12px", color: "rgba(28,23,16,0.35)", fontFamily: "DM Sans, system-ui, sans-serif", lineHeight: 1.6 }}>
        Documents are optional — you can also email them to hello@cedarx.io after submitting. We'll follow up to collect anything needed.
      </p>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "DM Sans, system-ui, sans-serif", color: "rgba(28,23,16,0.40)" }}>
          <ChevronLeft size={13} /> Back
        </button>
        <button
          onClick={onNext}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "10px 24px",
            fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
            fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 400,
            color: "#C4852A",
            background: "transparent",
            border: "1px solid rgba(196,133,42,0.55)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Pricing ──────────────────────────────────────────────────────────

function Step3({
  form, set, onBack, onNext,
}: {
  form: TokenizeRequest;
  set: (p: Partial<TokenizeRequest>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <p style={{ fontSize: "14px", fontWeight: 300, color: "var(--cedar-muted)", lineHeight: 1.7 }}>
        Set your asking price in USDC. This is the amount buyers will see when your property is listed on CedarX.
        You can update it later.
      </p>

      <Field id="asking_price" label="Asking price (USDC)">
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(28,23,16,0.40)", fontFamily: "JetBrains Mono, monospace", fontSize: "14px" }}>$</span>
          <input
            id="asking_price"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 25000"
            value={form.asking_price ?? ""}
            onChange={e => set({ asking_price: e.target.value ? Number(e.target.value) : undefined })}
            style={{ ...inputStyle, paddingLeft: "28px" }}
          />
        </div>
        {form.asking_price && form.asking_price > 0 && (
          <p style={{ fontSize: "12px", color: "rgba(28,23,16,0.40)", fontFamily: "DM Sans, system-ui, sans-serif", marginTop: "4px" }}>
            Listed at{" "}
            <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {form.asking_price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} USDC
            </strong>
          </p>
        )}
      </Field>

      <Field id="email" label="Your email address" required>
        <input
          id="email"
          type="email"
          required
          placeholder="you@example.com"
          value={form.email}
          onChange={e => set({ email: e.target.value })}
          style={inputStyle}
        />
        <p style={{ fontSize: "12px", color: "rgba(28,23,16,0.40)", fontFamily: "DM Sans, system-ui, sans-serif", marginTop: "4px" }}>
          We'll use this to send you updates on your request.
        </p>
      </Field>

      <Field id="notes" label="Additional notes">
        <textarea
          id="notes"
          rows={3}
          placeholder="Anything else you'd like us to know about the property…"
          value={form.notes ?? ""}
          onChange={e => set({ notes: e.target.value })}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Field>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "DM Sans, system-ui, sans-serif", color: "rgba(28,23,16,0.40)" }}>
          <ChevronLeft size={13} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!form.email.trim()}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "10px 24px",
            fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
            fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 400,
            color: form.email.trim() ? "#C4852A" : "rgba(196,133,42,0.35)",
            background: "transparent",
            border: `1px solid ${form.email.trim() ? "rgba(196,133,42,0.55)" : "rgba(196,133,42,0.20)"}`,
            cursor: form.email.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          Review <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Review & Submit ──────────────────────────────────────────────────

function Step4({
  form, onBack, onSubmit, submitting, errorMsg,
}: {
  form: TokenizeRequest;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  errorMsg: string;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Address", value: [form.address, form.city, form.state].filter(Boolean).join(", ") },
    ...(form.county    ? [{ label: "County",     value: form.county }] : []),
    ...(form.parcel_id ? [{ label: "Parcel ID",  value: form.parcel_id }] : []),
    ...(form.acreage   ? [{ label: "Acreage",    value: `${form.acreage} acres` }] : []),
    ...(form.asking_price ? [{ label: "Asking price", value: `$${form.asking_price.toLocaleString("en-US")} USDC` }] : []),
    { label: "Email",   value: form.email },
    ...(form.notes     ? [{ label: "Notes",      value: form.notes }] : []),
  ];

  return (
    <div className="space-y-5">
      <p style={{ fontSize: "14px", fontWeight: 300, color: "var(--cedar-muted)", lineHeight: 1.7 }}>
        Review your submission. Once submitted, our team will contact you within 2–5 business days.
      </p>

      <div style={{ border: "1px solid rgba(196,133,42,0.15)", background: "rgba(196,133,42,0.03)" }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: "12px",
              padding: "10px 16px",
              borderTop: i > 0 ? "1px solid rgba(196,133,42,0.08)" : "none",
            }}
          >
            <span style={{ ...labelStyle, fontSize: "10px" }}>{row.label}</span>
            <span style={{ fontSize: "13px", color: "var(--cedar-text, #1C1710)", fontFamily: "DM Sans, system-ui, sans-serif", wordBreak: "break-word" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {errorMsg && (
        <p style={{ fontSize: "13px", color: "#7A3535", fontFamily: "DM Sans, system-ui, sans-serif" }}>
          {errorMsg}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} disabled={submitting} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: submitting ? "not-allowed" : "pointer", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "DM Sans, system-ui, sans-serif", color: "rgba(28,23,16,0.40)", opacity: submitting ? 0.4 : 1 }}>
          <ChevronLeft size={13} /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "12px 28px",
            fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
            fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 400,
            color: "#C4852A",
            background: "transparent",
            border: "1px solid rgba(196,133,42,0.55)",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </div>
  );
}

// ─── TokenizePage ─────────────────────────────────────────────────────────────

export function TokenizePage() {
  const { address } = useAccount();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TokenizeRequest>({
    address: "",
    city: "",
    state: "",
    county: "",
    parcel_id: "",
    acreage: undefined,
    asking_price: undefined,
    owner_wallet: address ?? "",
    email: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [errorMsg, setErrorMsg]     = useState("");

  const { data: statesData } = useQuery({
    queryKey: ["property-states"],
    queryFn: fetchStates,
    staleTime: 600_000,
  });
  const states = statesData?.data ?? FALLBACK_STATES;

  function set(partial: Partial<TokenizeRequest>) {
    setForm(f => ({ ...f, ...partial }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMsg("");
    try {
      await postTokenizeRequest({
        address:      form.address.trim(),
        city:         form.city?.trim()      || undefined,
        state:        form.state,
        county:       form.county?.trim()    || undefined,
        parcel_id:    form.parcel_id?.trim() || undefined,
        acreage:      form.acreage           || undefined,
        asking_price: form.asking_price      || undefined,
        owner_wallet: address               ?? undefined,
        email:        form.email.trim(),
        notes:        form.notes?.trim()     || undefined,
      });
      setDone(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pt-28 pb-24">
      {/* Header */}
      <div style={{ marginBottom: "48px" }}>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)", marginBottom: "12px" }}>
          CedarX · Land tokenization
        </p>
        <h1 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em", color: "var(--cedar-text, #1C1710)", marginBottom: "16px" }}>
          Tokenize your land
        </h1>
        <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 300, fontSize: "15px", lineHeight: 1.7, color: "var(--cedar-muted)", maxWidth: "480px" }}>
          Bring your property onchain. Fill in the details below and we'll guide you through the entire process.
        </p>
      </div>

      {done ? (
        <div style={{ padding: "32px", border: "1px solid rgba(196,133,42,0.20)", background: "rgba(196,133,42,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <CheckCircle size={22} style={{ color: "#C4852A" }} />
            <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#C4852A" }}>
              Request received.
            </p>
          </div>
          <p style={{ fontSize: "14px", fontWeight: 300, color: "var(--cedar-muted)", lineHeight: 1.7 }}>
            We'll review your submission and guide you through the tokenization process. Most properties go live within 7–14 business days. Check your email for next steps.
          </p>
        </div>
      ) : (
        <>
          <StepBar current={step} />
          {step === 0 && <Step1 form={form} set={set} states={states} onNext={() => setStep(1)} />}
          {step === 1 && <Step2 onBack={() => setStep(0)} onNext={() => setStep(2)} />}
          {step === 2 && <Step3 form={form} set={set} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
          {step === 3 && (
            <Step4
              form={form}
              onBack={() => setStep(2)}
              onSubmit={() => void handleSubmit()}
              submitting={submitting}
              errorMsg={errorMsg}
            />
          )}
        </>
      )}
    </div>
  );
}
