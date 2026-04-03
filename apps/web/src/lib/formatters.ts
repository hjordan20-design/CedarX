// ─── Currency ─────────────────────────────────────────────────────────────────

/** Format a USDC price for display. e.g. 18000 → "$18,000 USDC" */
export function formatUSDC(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return "—";
  const n = Number(amount);
  if (isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDC`;
}

/** Format USDC with decimals. e.g. 18000.50 → "$18,000.50 USDC" */
export function formatUSDCExact(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return "—";
  const n = Number(amount);
  if (isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

/** Format volume compactly. e.g. 1_250_000 → "$1.25M" */
export function formatVolume(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return "—";
  const n = Number(amount);
  if (isNaN(n) || n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

// ─── Addresses ───────────────────────────────────────────────────────────────

/** Truncate an Ethereum address for display. e.g. 0xAbCd…1234 */
export function truncateAddress(addr: string | undefined): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** Format a date string to readable format. e.g. "2027-01-01" → "Jan 1, 2027" */
export function formatDate(date: string | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a date range. e.g. "Jan 1 – Jun 30, 2027" */
export function formatDateRange(start: string | undefined, end: string | undefined): string {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startStr = s.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endStr = e.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

/** Relative time. e.g. "2 hours ago" */
export function timeAgo(iso: string | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** Compact number formatting. e.g. 1250 → "1.25K" */
export function formatCount(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}
