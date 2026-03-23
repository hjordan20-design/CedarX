/**
 * useWalletNFTs
 *
 * Scans the connected wallet for NFTs from CedarX-whitelisted protocol contracts
 * using the Alchemy NFT API.  Returns separate lists for Ethereum (Fabrica + 4K)
 * and Polygon (Courtyard) since they require different RPC calls.
 *
 * Whitelisted contracts:
 *   Ethereum — Fabrica (ERC-1155), 4K Protocol (ERC-1155)
 *   Polygon  — Courtyard (ERC-721)
 */

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined;

// Whitelisted contract addresses (all lowercase for comparison)
const ETH_CONTRACTS = [
  "0x5cbeb7a0df7ed85d82a472fd56d81ed550f3ea95", // Fabrica
  "0xebf19415d94be89a1d692f82af391685dc1bff79", // 4K Protocol
];

const POLYGON_CONTRACTS = [
  "0x251be3a17af4892035c37ebf5890f4a4d889dcad", // Courtyard
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
  "0xebf19415d94be89a1d692f82af391685dc1bff79": "4K Protocol",
  "0x251be3a17af4892035c37ebf5890f4a4d889dcad": "Courtyard",
};

async function fetchAlchemyNFTs(
  network: string,
  ownerAddress: string,
  contractAddresses: string[]
): Promise<AlchemyNFTOwner[]> {
  if (!ALCHEMY_KEY) return [];
  const url = new URL(`https://${network}.g.alchemy.com/nft/v3/${ALCHEMY_KEY}/getNFTsForOwner`);
  url.searchParams.set("owner", ownerAddress);
  url.searchParams.set("withMetadata", "true");
  url.searchParams.set("pageSize", "100");
  for (const c of contractAddresses) {
    url.searchParams.append("contractAddresses[]", c);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Alchemy NFT API error ${res.status}`);
  const body = (await res.json()) as AlchemyResponse;
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

      const [ethNfts, polyNfts] = await Promise.all([
        fetchAlchemyNFTs("eth-mainnet",      address, ETH_CONTRACTS),
        fetchAlchemyNFTs("polygon-mainnet",  address, POLYGON_CONTRACTS),
      ]);

      return [
        ...mapNFTs(ethNfts,  "ethereum"),
        ...mapNFTs(polyNfts, "polygon"),
      ];
    },
    enabled: !!address,
    staleTime: 120_000,
    retry: 1,
  });
}
