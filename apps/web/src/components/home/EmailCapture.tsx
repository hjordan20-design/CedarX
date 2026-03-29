import { useState } from "react";
import { API_BASE_URL } from "@/config/api";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "homepage" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Subscription failed.");
      }
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <section
      className="px-6 lg:px-[80px]"
      style={{ paddingTop: "24px", paddingBottom: "64px" }}
    >
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Divider accent */}
        <div
          style={{
            width: "24px",
            height: "1px",
            background: "rgba(196,133,42,0.40)",
            margin: "0 auto 24px",
          }}
        />

        <h2
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 300,
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            letterSpacing: "-0.02em",
            color: "var(--cedar-text, #1C1710)",
            marginBottom: "10px",
          }}
        >
          Stay in the loop
        </h2>
        <p
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontSize: "15px",
            fontWeight: 300,
            color: "var(--cedar-muted, rgba(28,23,16,0.50))",
            marginBottom: "24px",
            lineHeight: 1.5,
          }}
        >
          Get notified about new listings, drops, and platform updates.
        </p>

        {status === "done" ? (
          <p
            style={{
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontSize: "15px",
              letterSpacing: "0.04em",
              color: "#C4852A",
            }}
          >
            You're in.
          </p>
        ) : (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            style={{
              display: "flex",
              gap: "8px",
              maxWidth: "400px",
              margin: "0 auto",
            }}
          >
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                flex: 1,
                padding: "10px 14px",
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontSize: "16px",
                border: "1px solid rgba(196,133,42,0.20)",
                borderBottom: "2px solid rgba(196,133,42,0.30)",
                background: "rgba(255,255,255,0.70)",
                color: "var(--cedar-text, #1C1710)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                padding: "10px 20px",
                fontSize: "12px",
                letterSpacing: "0.10em",
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 400,
                textTransform: "uppercase",
                color: "#C4852A",
                background: "transparent",
                border: "1px solid rgba(196,133,42,0.55)",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
                opacity: status === "loading" ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (status !== "loading") {
                  (e.currentTarget as HTMLElement).style.background = "#C4852A";
                  (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#C4852A";
              }}
            >
              {status === "loading" ? "…" : "Subscribe"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p
            style={{
              fontSize: "12px",
              color: "#7A3535",
              marginTop: "10px",
              fontFamily: "DM Sans, system-ui, sans-serif",
            }}
          >
            {errorMsg}
          </p>
        )}
      </div>
    </section>
  );
}
