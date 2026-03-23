import { useQuery } from "@tanstack/react-query";
import { fetchSeaportOrder } from "@/lib/api";
import type { SeaportOrder } from "@/lib/types";

/**
 * Fetch the active Seaport order for an asset.
 * Returns null when no active order exists (404 from the API).
 */
export function useSeaportOrder(assetId: string | undefined) {
  return useQuery<SeaportOrder | null>({
    queryKey: ["seaport-order", assetId],
    queryFn: async () => {
      if (!assetId) return null;
      try {
        return await fetchSeaportOrder(assetId);
      } catch (err) {
        // 404 means no active order — treat as null, not an error
        if (err instanceof Error && err.message.includes("404")) return null;
        throw err;
      }
    },
    enabled: !!assetId,
    staleTime: 60_000,   // Seaport orders change infrequently
    retry: false,
  });
}
