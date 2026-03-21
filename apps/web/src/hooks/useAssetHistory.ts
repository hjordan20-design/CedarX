import { useQuery } from "@tanstack/react-query";
import { fetchAssetHistory } from "@/lib/api";

export interface HistoryItem {
  type: "sale" | "listing" | "cancellation" | "transfer" | "mint";
  price?: number;
  from?: string;
  to?: string;
  txHash?: string;
  blockNumber?: number;
  timestamp?: string;
}

export function useAssetHistory(id: string) {
  return useQuery({
    queryKey: ["asset-history", id],
    queryFn: async () => {
      const result = await fetchAssetHistory(id);
      return result.data as HistoryItem[];
    },
    staleTime: 60_000,
    enabled: !!id,
  });
}
