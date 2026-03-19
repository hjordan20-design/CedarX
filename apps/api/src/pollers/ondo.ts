/**
 * OndoPoller — indexes Ondo Finance tokenized treasuries (ERC-20) on Ethereum.
 *
 * Session 3: scaffold only.
 * Session 4: full implementation — fetch token supply, NAV per token, and
 *            APY from Ondo's on-chain oracle or API. One asset row per token.
 */

import { BasePoller } from "./base";
import { ONDO_OUSG, ONDO_USDY, ONDO_ROUSG } from "../config";

// Ondo tokens are ERC-20 — there are only 3 of them.
// No Transfer event scanning needed; we simply refresh their metadata on each tick.
const ONDO_TOKENS = [
    { address: ONDO_OUSG,  name: "OUSG — US Government Bond Fund",    deployedBlock: 16_520_000 },
    { address: ONDO_USDY,  name: "USDY — US Dollar Yield",            deployedBlock: 17_400_000 },
    { address: ONDO_ROUSG, name: "rOUSG — Rebasing US Government Bond", deployedBlock: 18_000_000 },
] as const;

export class OndoPoller extends BasePoller {
    readonly pollerId = "ondo";
    readonly startBlock = 16_520_000; // earliest of the three tokens

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        // TODO (Session 4): for each Ondo token, read totalSupply() and
        // pricePerShare() (or equivalent oracle), fetch APY from Ondo's API,
        // normalize and call upsertAsset().
        this.log(
            `[stub] would refresh ${ONDO_TOKENS.length} Ondo tokens ` +
            `(blocks ${fromBlock}–${toBlock})`
        );
    }
}
