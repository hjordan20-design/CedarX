import { useQuery } from "@tanstack/react-query";

const FALLBACK_ETH_USD = 2500; // used if CoinGecko is unreachable

interface CoinGeckoResponse {
  ethereum: { usd: number };
}

async function fetchEthPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    { headers: { accept: "application/json" } }
  );
  if (!res.ok) return FALLBACK_ETH_USD;
  const data = (await res.json()) as CoinGeckoResponse;
  return data?.ethereum?.usd ?? FALLBACK_ETH_USD;
}

/**
 * Returns the current ETH/USD price, fetched from CoinGecko free API.
 * Falls back to $2,500 if the request fails.
 * Cached for 5 minutes across the app.
 */
export function useEthPrice(): number {
  const { data } = useQuery<number>({
    queryKey: ["eth-usd-price"],
    queryFn: fetchEthPrice,
    staleTime: 5 * 60 * 1000,   // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
  return data ?? FALLBACK_ETH_USD;
}
