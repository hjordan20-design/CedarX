import { useQuery } from "@tanstack/react-query";
import { fetchAssets } from "@/lib/api";
import type { AssetFilters } from "@/lib/types";

export function useAssets(filters: AssetFilters = {}) {
  return useQuery({
    queryKey: ["assets", filters],
    queryFn: () => fetchAssets(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
