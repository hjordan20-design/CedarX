/**
 * useWalletNFTs
 *
 * Scans the connected wallet for Fabrica land NFTs on Ethereum mainnet
 * using the Alchemy NFT API.
 *
 * CedarX is land-only — only the Fabrica ERC-1155 contract is whitelisted.
 */

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

const ALCHEMY_ETH_KEY = (
  import.meta.env.VITE_ALCHEMY_ETH_API_KEY ||
  import.meta.env.VITE_ALCHEMY_API_KEY
) as string | undefined;

// Fabrica Land (ERC-1155) on Ethereum mainnet — the only whitelisted contract.
const ETH_CONTRACTS = [
  "0x5cbeb7a0df7ed85d82a472fd56d81ed550f3ea95", // Fabrica
];

export interface WalletNFT {
  contractAddress: string;
  tokenId: string;
  tokenStandard: "ERC-721" | "ERC-1155";
  name: string;
  imageUrl: string | null;
  chain: "ethereum" | "polygon";
  protocol: string;
}

interface AlchemyNFTOwner {
  contract: { address: string };
  tokenId:  string;
  tokenType: string;
  name?: string;
  description?: string;
  image?: { cachedUrl?: string; thumbnailUrl?: string; originalUrl?: string };
}

interface AlchemyResponse {
  ownedNfts: AlchemyNFTOwner[];
  totalCount: number;
}

const PROTOCOL_LABELS: Record<string, string> = {
  "0x5cbeb7a0df7ed85d82a472fd56d81ed550f3ea95": "Fabrica",
};

async function fetchAlchemyNFTs(
  network: string,
  apiKey: string,
  ownerAddress: string,
  contractAddresses: string[]
): Promise<AlchemyNFTOwner[]> {
  const url = new URL(`https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`);
  url.searchParams.set("owner", ownerAddress);
  url.searchParams.set("withMetadata", "true");
  url.searchParams.set("pageSize", "100");
  for (const c of contractAddresses) {
    url.searchParams.append("contractAddresses[]", c);
  }
  // Log the URL being called (mask the key for safety)
  const maskedUrl = url.toString().replace(apiKey, `${apiKey.slice(0, 6)}…`);
  console.log(`[useWalletNFTs] Fetching ${network}:`, maskedUrl);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[useWalletNFTs] Alchemy ${network} error ${res.status}:`, text);
    throw new Error(`Alchemy NFT API error ${res.status} on ${network}`);
  }
  const body = (await res.json()) as AlchemyResponse;
  console.log(`[useWalletNFTs] ${network} response — totalCount:`, body.totalCount, "nfts:", body.ownedNfts?.length ?? 0);
  return body.ownedNfts ?? [];
}

function mapNFTs(
  nfts: AlchemyNFTOwner[],
  chain: "ethereum" | "polygon"
): WalletNFT[] {
  return nfts.map((n) => {
    const addr = n.contract.address.toLowerCase();
    return {
      contractAddress: addr,
      tokenId:         n.tokenId,
      tokenStandard:   (n.tokenType === "ERC1155" ? "ERC-1155" : "ERC-721") as WalletNFT["tokenStandard"],
      name:            n.name ?? `Token #${n.tokenId}`,
      imageUrl:
        n.image?.cachedUrl ?? n.image?.thumbnailUrl ?? n.image?.originalUrl ?? null,
      chain,
      protocol:        PROTOCOL_LABELS[addr] ?? "Unknown",
    };
  });
}

export function useWalletNFTs() {
  const { address } = useAccount();

  return useQuery<WalletNFT[]>({
    queryKey: ["wallet-nfts", address],
    queryFn: async () => {
      if (!address) return [];

      if (!ALCHEMY_ETH_KEY) {
        console.warn("[useWalletNFTs] No Alchemy API key set — cannot scan NFTs");
        return [];
      }

      const nfts = await fetchAlchemyNFTs("eth-mainnet", ALCHEMY_ETH_KEY, address, ETH_CONTRACTS);
      return mapNFTs(nfts, "ethereum");
    },
    enabled: !!address,
    staleTime: 120_000,
    retry: 1,
  });
}
