import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStates, postTokenizeRequest } from "@/lib/api";
import type { TokenizeRequest } from "@/lib/api";

export function TokenizePage() {
  const [form, setForm] = useState<TokenizeRequest>({
    address: "",
    state: "",
    county: "",
    email: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: statesData } = useQuery({
    queryKey: ["property-states"],
    queryFn: fetchStates,
    staleTime: 600_000,
  });
  const states = statesData?.data ?? [];

  function set(partial: Partial<TokenizeRequest>) {
    setForm(f => ({ ...f, ...partial }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address.trim() || !form.state || !form.email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      await postTokenizeRequest({
        address: form.address.trim(),
        state:   form.state,
        county:  form.county?.trim() || undefined,
        email:   form.email.trim(),
        notes:   form.notes?.trim() || undefined,
      });
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pt-28 pb-24">
      {/* Header */}
      <div style={{ marginBottom: "48px" }}>
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(28,23,16,0.35)",
            marginBottom: "12px",
          }}
        >
          Fabrica protocol
        </p>
        <h1
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 300,
            fontSize: "clamp(2rem, 4vw, 3rem)",
            letterSpacing: "-0.02em",
            color: "var(--cedar-text, #1C1710)",
            marginBottom: "16px",
          }}
        >
          Tokenize your land
        </h1>
        <p
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontWeight: 300,
            fontSize: "15px",
            lineHeight: 1.7,
            color: "var(--cedar-muted)",
            maxWidth: "480px",
          }}
        >
          Own a land parcel? Submit a request to put your deed onchain through the Fabrica protocol.
          We'll reach out with next steps.
        </p>
      </div>

      {status === "done" ? (
        <div
          style={{
            padding: "32px",
            border: "1px solid rgba(196,133,42,0.20)",
            background: "rgba(196,133,42,0.04)",
          }}
        >
          <p
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontSize: "22px",
              fontWeight: 300,
              color: "#C4852A",
              marginBottom: "8px",
            }}
          >
            Request received.
          </p>
          <p style={{ fontSize: "14px", fontWeight: 300, color: "var(--cedar-muted)", lineHeight: 1.7 }}>
            We'll review your submission and follow up at {form.email}.
            Typical response time is 1–3 business days.
          </p>
        </div>
      ) : (
        <form onSubmit={e => void handleSubmit(e)} className="space-y-6">
          {/* Property address */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="address"
              style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cedar-muted)", fontFamily: "DM Sans, system-ui, sans-serif" }}
            >
              Property address *
            </label>
            <input
              id="address"
              type="text"
              required
              placeholder="123 Main St, Springfield, IL 62701"
              value={form.address}
              onChange={e => set({ address: e.target.value })}
              style={{
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
              }}
            />
          </div>

          {/* State */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="state"
              style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cedar-muted)", fontFamily: "DM Sans, system-ui, sans-serif" }}
            >
              State *
            </label>
            <select
              id="state"
              required
              value={form.state}
              onChange={e => set({ state: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontSize: "15px",
                fontWeight: 300,
                border: "1px solid rgba(196,133,42,0.20)",
                borderBottom: "2px solid rgba(196,133,42,0.30)",
                background: "rgba(255,255,255,0.70)",
                color: form.state ? "var(--cedar-text, #1C1710)" : "var(--cedar-muted)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Select a state</option>
              {states.length > 0
                ? states.map(s => <option key={s} value={s}>{s}</option>)
                : [
                    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
                    "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
                    "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
                    "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
                    "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
                    "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
                    "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
                    "Wisconsin","Wyoming",
                  ].map(s => <option key={s} value={s}>{s}</option>)
              }
            </select>
          </div>

          {/* County */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="county"
              style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cedar-muted)", fontFamily: "DM Sans, system-ui, sans-serif" }}
            >
              County
            </label>
            <input
              id="county"
              type="text"
              placeholder="e.g. Yavapai County"
              value={form.county ?? ""}
              onChange={e => set({ county: e.target.value })}
              style={{
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
              }}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cedar-muted)", fontFamily: "DM Sans, system-ui, sans-serif" }}
            >
              Your email *
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={e => set({ email: e.target.value })}
              style={{
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
              }}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="notes"
              style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cedar-muted)", fontFamily: "DM Sans, system-ui, sans-serif" }}
            >
              Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={4}
              placeholder="Acreage, parcel ID, any other details about the property…"
              value={form.notes ?? ""}
              onChange={e => set({ notes: e.target.value })}
              style={{
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
                resize: "vertical",
              }}
            />
          </div>

          {status === "error" && (
            <p style={{ fontSize: "13px", color: "#7A3535", fontFamily: "DM Sans, system-ui, sans-serif" }}>
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              padding: "12px 32px",
              fontSize: "12px",
              letterSpacing: "0.12em",
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 400,
              textTransform: "uppercase",
              color: "#C4852A",
              background: "transparent",
              border: "1px solid rgba(196,133,42,0.55)",
              cursor: status === "loading" ? "not-allowed" : "pointer",
              transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
              opacity: status === "loading" ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (status !== "loading") {
                (e.currentTarget as HTMLElement).style.background = "#C4852A";
                (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#C4852A";
            }}
          >
            {status === "loading" ? "Submitting…" : "Submit request"}
          </button>
        </form>
      )}
    </div>
  );
}
