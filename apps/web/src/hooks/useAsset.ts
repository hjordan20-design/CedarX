import { useQuery } from "@tanstack/react-query";
import { fetchAsset } from "@/lib/api";

export function useAsset(id: string) {
  return useQuery({
    queryKey: ["asset", id],
    queryFn: () => fetchAsset(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}
