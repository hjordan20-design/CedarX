import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  /** null when counting was skipped (large query). Shows prev/next only. */
  total: number | null;
  hasMore: boolean;
  limit: number;
  onChange: (page: number) => void;
}

const btn =
  "inline-flex items-center justify-center w-9 h-9 text-sm font-sans border border-cedar-border " +
  "text-cedar-muted transition-colors duration-150 hover:border-cedar-muted hover:text-cedar-text " +
  "disabled:opacity-30 disabled:cursor-not-allowed";

export function Pagination({ page, total, hasMore, limit, onChange }: PaginationProps) {
  // ── Unknown total: prev/next only ────────────────────────────────────────────
  if (total === null) {
    if (page <= 1 && !hasMore) return null;
    return (
      <div className="flex items-center justify-center gap-3 pt-8">
        <button
          className={btn}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-cedar-muted text-xs font-mono tabular-nums">
          Page {page}
        </span>
        <button
          className={btn}
          disabled={!hasMore}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Known total: full page-number range ───────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const delta = 2;
  const range: (number | "…")[] = [];
  const left  = Math.max(2, page - delta);
  const right = Math.min(totalPages - 1, Math.max(page + delta, 5));

  range.push(1);
  if (left > 2) range.push("…");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push("…");
  if (totalPages > 1) range.push(totalPages);

  const activeCls = "!border-cedar-amber !text-cedar-amber";

  return (
    <div className="flex items-center justify-center gap-1.5 pt-8">
      <button
        className={btn}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {range.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 inline-flex items-center justify-center text-cedar-muted text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`${btn} ${p === page ? activeCls : ""}`}
            onClick={() => onChange(p as number)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        className={btn}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
