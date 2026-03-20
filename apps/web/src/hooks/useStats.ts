import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "@/lib/api";

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    staleTime: 60_000,       // refresh every minute
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
