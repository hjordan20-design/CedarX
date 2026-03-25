import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  // Show a window of 5 pages, always including pages 1-5 at the start.
  const delta = 2;
  const range: (number | "…")[] = [];

  const left  = Math.max(2, page - delta);
  // Ensure at least pages 1-5 are visible on early pages
  const right = Math.min(totalPages - 1, Math.max(page + delta, 5));

  range.push(1);
  if (left > 2) range.push("…");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push("…");
  if (totalPages > 1) range.push(totalPages);

  const btn =
    "inline-flex items-center justify-center w-9 h-9 text-sm font-sans border border-cedar-border " +
    "text-cedar-muted transition-colors duration-150 hover:border-cedar-muted hover:text-cedar-text " +
    "disabled:opacity-30 disabled:cursor-not-allowed";

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
