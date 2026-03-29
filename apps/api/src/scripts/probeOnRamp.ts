/**
 * probeOnRamp.ts — read-only probe of Fabrica on-ramp API endpoints.
 *
 * Tests whether these endpoints respond without JWT authentication,
 * the same way the public RETS feed does.
 *
 * Run with:
 *   pnpm --filter @cedarx/api exec tsx src/scripts/probeOnRamp.ts
 *
 * IMPORTANT: This script only performs read-only GET requests.
 * It does not create, modify, or submit anything.
 */

const BASE = "https://api3.fabrica.land";

const CONTRACT = "0x5cbeb7a0df7ed85d82a472fd56d81ed550f3ea95";

const ENDPOINTS = [
  {
    label: "on-ramp query (address+state+county)",
    url: `${BASE}/on-ramp?address=123+Main+St&state=AZ&county=Maricopa`,
  },
  {
    label: "token steps-and-fields (contract path)",
    url: `${BASE}/token/ethereum/${CONTRACT}/steps-and-fields?address=123+Main+St`,
  },
  {
    label: "on-ramp steps-and-fields (query params)",
    url: `${BASE}/on-ramp/steps-and-fields?address=123+Main+St&state=AZ`,
  },
];

async function probe(label: string, url: string): Promise<void> {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`Endpoint : ${label}`);
  console.log(`URL      : ${url}`);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "CedarX-probe/1.0 (read-only)",
      },
      // 10 second timeout via AbortController
      signal: AbortSignal.timeout(10_000),
    });

    console.log(`Status   : ${res.status} ${res.statusText}`);
    console.log(`Headers  : content-type=${res.headers.get("content-type") ?? "n/a"}`);

    const raw = await res.text();
    // Truncate long responses for readability
    const preview = raw.length > 600 ? raw.slice(0, 600) + "\n…[truncated]" : raw;

    if (res.ok) {
      console.log(`✅ OPEN  — response body:`);
      console.log(preview);
    } else {
      console.log(`❌ CLOSED — error body:`);
      console.log(preview);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`💥 NETWORK ERROR: ${msg}`);
  }
}

async function main() {
  console.log("Fabrica on-ramp API probe — read-only GET requests only");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  for (const ep of ENDPOINTS) {
    await probe(ep.label, ep.url);
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log("Probe complete.");
}

main().catch(console.error);
