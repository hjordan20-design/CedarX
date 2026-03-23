// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Format a token price for display.
 * Stablecoins (USDC, USDT, DAI) → "$17.00"
 * All others (ETH, WETH, …)     → "0.70 ETH"
 */
export function formatTokenPrice(amount: number | string | undefined, symbol?: string): string {
  if (amount === undefined || amount === null) return "—";
  const n = Number(amount);
  if (isNaN(n)) return "—";
  const isStable = !symbol || symbol === "USDC" || symbol === "USDT" || symbol === "DAI";
  if (isStable) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${symbol}`;
}

/** Format a USDC amount for display. e.g. 12500.5 → "$12,500.50" */
export function formatUSDC(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return "—";
  const n = Number(amount);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Strip basic markdown syntax, returning plain text.
 *  Handles [link](url), **bold**, *italic*, __underline__, _italic_,
 *  # headings, and --- horizontal rules (incl. Courtyard "--- # heading" pattern). */
export function stripMarkdown(text: string | undefined | null): string {
  if (!text) return "";
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")   // [text](url) → text
    .replace(/\*\*([^*]+)\*\*/g, "$1")          // **bold** → text
    .replace(/\*([^*]+)\*/g, "$1")              // *italic* → text
    .replace(/__([^_]+)__/g, "$1")              // __text__ → text
    .replace(/_([^_]+)_/g, "$1")               // _italic_ → text
    .replace(/^-{3,}\s*/gm, "")                 // --- horizontal rules → empty
    .replace(/^#+\s*/gm, "")                    // # headings → text
    .replace(/\n{3,}/g, "\n\n")                 // collapse excessive blank lines
    .trim();
}

/** Format volume compactly. e.g. 1_250_000 → "$1.25M" */
export function formatVolume(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return "—";
  const n = Number(amount);
  if (isNaN(n) || n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return formatUSDC(n);
}

// ─── Percentages ──────────────────────────────────────────────────────────────

/** Format an APY decimal to percentage string. e.g. 0.052 → "5.2%" */
export function formatAPY(apy: number | undefined): string {
  if (apy === undefined || apy === null) return "—";
  return `${(apy * 100).toFixed(2)}%`;
}

/** Format a yield decimal. Same as APY but label-agnostic. */
export function formatYield(y: number | undefined): string {
  return formatAPY(y);
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

/** Compact integer formatting. e.g. 1250 → "1.25K" */
export function formatCount(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

/** Format acreage. e.g. 1.5 → "1.5 ac" */
export function formatAcreage(acres: number | undefined): string {
  if (acres === undefined) return "—";
  return `${acres.toLocaleString("en-US")} ac`;
}

// ─── Addresses ───────────────────────────────────────────────────────────────

/** Truncate an Ethereum address for display. e.g. 0xAbCd…1234 */
export function truncateAddress(addr: string | undefined): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** Format an ISO timestamp to a readable date. e.g. "Jun 28, 2025" */
export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
