/**
 * IPFS metadata fetching utilities.
 *
 * Converts ipfs:// URIs to HTTP gateway URLs and fetches JSON metadata with
 * automatic gateway fallback and a configurable timeout.
 */

// Ordered list of public IPFS gateways to try
const GATEWAYS = [
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
];

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Convert any IPFS URI variant to a plain HTTPS URL using the given gateway.
 *
 * Handles:
 *   ipfs://QmXxx           → https://gateway/ipfs/QmXxx
 *   ipfs://QmXxx/meta.json → https://gateway/ipfs/QmXxx/meta.json
 *   https://ipfs.io/ipfs/… → returned as-is (already HTTP)
 *   https://…              → returned as-is
 */
export function ipfsToHttp(uri: string, gateway = GATEWAYS[0]): string {
    if (uri.startsWith("ipfs://")) {
        const cid = uri.slice("ipfs://".length);
        return `${gateway}${cid}`;
    }
    return uri; // already an HTTP URL
}

/**
 * Fetch and parse a JSON metadata document from an IPFS URI (or HTTP URL).
 * Tries each gateway in order until one succeeds.
 *
 * @throws if all gateways fail or the response is not valid JSON.
 */
export async function fetchIPFSJson<T = unknown>(uri: string): Promise<T> {
    // For plain HTTP URLs, skip gateway rotation
    if (!uri.startsWith("ipfs://")) {
        return fetchJson<T>(uri);
    }

    const cid = uri.slice("ipfs://".length);
    let lastError: unknown;

    for (const gateway of GATEWAYS) {
        const url = `${gateway}${cid}`;
        try {
            return await fetchJson<T>(url);
        } catch (err) {
            lastError = err;
        }
    }

    throw new Error(`All IPFS gateways failed for ${uri}: ${String(lastError)}`);
}

async function fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
        return (await res.json()) as T;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Resolve an IPFS image URI to a public HTTP URL (for storing in image_url).
 * Returns null if the URI is empty or undefined.
 */
export function resolveImageUrl(uri: string | undefined | null): string | null {
    if (!uri) return null;
    return ipfsToHttp(uri, GATEWAYS[0]);
}
