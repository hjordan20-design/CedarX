/** Shimmer skeleton for a stat pill */
export function StatSkeleton() {
  return (
    <div className="border border-cedar-border px-4 py-2.5 flex items-baseline gap-2.5 animate-pulse">
      <div className="h-5 w-16 bg-cedar-surface-alt rounded-sm" />
      <div className="h-3 w-20 bg-cedar-surface-alt rounded-sm" />
    </div>
  );
}

/** Shimmer skeleton for an asset card */
export function CardSkeleton() {
  return (
    <div className="bg-cedar-surface border border-cedar-border animate-pulse">
      <div className="aspect-video bg-cedar-surface-alt" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-16 bg-cedar-surface-alt rounded-sm" />
        <div className="h-4 w-3/4 bg-cedar-surface-alt rounded-sm" />
        <div className="h-3 w-1/2 bg-cedar-surface-alt rounded-sm" />
      </div>
    </div>
  );
}

/** Full-page centered spinner */
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-6 h-6 border-2 border-cedar-border border-t-cedar-amber rounded-full animate-spin" />
    </div>
  );
}

/** Inline error message */
export function ErrorMessage({ message }: { message?: string }) {
  return (
    <p className="text-cedar-red text-sm font-mono">
      {message ?? "Something went wrong."}
    </p>
  );
}
