import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

const FAQ_SECTIONS: { heading: string; items: FAQItem[] }[] = [
  {
    heading: "The basics",
    items: [
      {
        q: "What is CedarX?",
        a: "CedarX is a peer-to-peer marketplace for tokenized real-world assets on Ethereum and Polygon. We index listings from protocols like Fabrica (land), 4K Protocol (luxury goods), and Courtyard (collectibles), and let you buy and sell them in one place using USDC.",
      },
      {
        q: "Who is CedarX for?",
        a: "Anyone with an Ethereum or Polygon-compatible wallet who wants exposure to real-world assets onchain — without going through a broker, fund, or custodian. CedarX is a permissionless interface. There are no accounts to create and no KYC at the marketplace level, though individual asset protocols may have their own eligibility requirements.",
      },
      {
        q: "Is CedarX a custodian?",
        a: "No. CedarX never holds your tokens or your funds. All trades are peer-to-peer, executed by non-custodial smart contracts on Ethereum and Polygon. Tokens stay in sellers' wallets until the moment of settlement.",
      },
    ],
  },
  {
    heading: "How trades work",
    items: [
      {
        q: "How does a purchase work?",
        a: (
          <>
            When you click Buy, CedarX routes the order through a non-custodial swap contract. The flow is:
            <ol className="mt-3 space-y-2 list-decimal list-inside text-cedar-muted">
              <li>You approve a USDC transfer for the listing price.</li>
              <li>The swap contract executes — atomically transferring the asset token to your wallet and USDC to the seller.</li>
              <li>If either side of the transfer fails, the entire transaction reverts. You never lose funds to a partial fill.</li>
            </ol>
          </>
        ),
      },
      {
        q: "What wallets are supported?",
        a: "MetaMask, Coinbase Wallet, and any WalletConnect v2-compatible wallet. If your wallet can sign Ethereum and Polygon transactions, it works with CedarX. Most modern wallets support both networks out of the box — you can switch networks directly in the CedarX header.",
      },
      {
        q: "What is the payment token?",
        a: "All trades settle in USDC. On Ethereum mainnet, you pay with USDC on Ethereum. On Polygon, you pay with USDC on Polygon. CedarX supports both chains — select your network in the header before browsing or buying.",
      },
      {
        q: "What fees does CedarX charge?",
        a: "CedarX charges a small protocol fee on each trade, deducted from the USDC settlement amount. The exact fee is shown in the trade confirmation screen before you approve the transaction.",
      },
      {
        q: "Can I list an asset for sale?",
        a: "Sell-side listings are coming soon. Initially CedarX surfaces inventory from indexed protocols. Native peer-to-peer listings will be available in a future release.",
      },
    ],
  },
  {
    heading: "Buying & selling",
    items: [
      {
        q: "What does 'For Sale' mean?",
        a: "An asset marked 'For Sale' has been listed by its owner at a fixed price. Click Buy, approve the USDC payment in your wallet, and the asset transfers to you instantly — no negotiation required.",
      },
      {
        q: "What does 'Make Offer' mean?",
        a: "An asset showing 'Make Offer' is not currently listed for sale. You can still submit a USDC offer directly to the owner. If the owner accepts, the trade settles automatically. Your wallet signs the offer off-chain — no gas is needed until the owner accepts.",
      },
      {
        q: "How does trade settlement work?",
        a: (
          <>
            All CedarX trades settle through a secure smart contract protocol. When a trade executes:
            <ol className="mt-3 space-y-2 list-decimal list-inside text-cedar-muted">
              <li>Your USDC payment and the seller's asset token are exchanged atomically in a single transaction.</li>
              <li>If either side fails, the entire transaction reverts — you cannot lose funds to a partial fill.</li>
              <li>There is no counterparty risk between signing and settlement.</li>
            </ol>
          </>
        ),
      },
      {
        q: "Are CedarX listings visible on other marketplaces?",
        a: "Yes. Listings created on CedarX are simultaneously visible on OpenSea and any other Seaport-compatible marketplace. Offers you submit through CedarX are also broadcast to OpenSea so sellers can see and accept them from any compatible interface.",
      },
    ],
  },
  {
    heading: "The protocols",
    items: [
      {
        q: "What is Fabrica?",
        a: "Fabrica is a protocol that tokenizes real property deeds on Ethereum. Each Fabrica token (ERC-721) represents full legal ownership of a US land parcel, backed by a deed held in a Wyoming LLC. Ownership of the token equals ownership of the land.",
      },
      {
        q: "What is 4K Protocol?",
        a: "4K Protocol tokenizes authenticated luxury goods — watches, jewelry, handbags, and more — as ERC-721 NFTs on Ethereum. Each token is backed by a physically authenticated item stored with a custodian. Owning the NFT gives you the right to redeem the physical item.",
      },
      {
        q: "What is Courtyard?",
        a: "Courtyard is a platform that tokenizes collectibles — trading cards, sports memorabilia, graded coins, and more — as ERC-721 NFTs on Polygon. Items are authenticated and vaulted by Courtyard. Holders can trade the NFT or redeem for the physical item at any time.",
      },
      {
        q: "What asset categories does CedarX support?",
        a: "CedarX currently supports real estate (Fabrica land parcels on Ethereum), luxury goods (4K Protocol on Ethereum), and collectibles (Courtyard on Polygon). Additional protocols and categories will be added — follow @cedarxio for announcements.",
      },
      {
        q: "Are there eligibility requirements for individual assets?",
        a: "Each underlying protocol has its own requirements. Fabrica assets are generally available to any Ethereum wallet holder, though individual property transactions may have jurisdiction-specific restrictions. Courtyard and 4K redemptions may require identity verification. CedarX displays requirements on each listing — it is your responsibility to verify eligibility before purchasing.",
      },
    ],
  },
  {
    heading: "Risk & security",
    items: [
      {
        q: "Is the CedarX smart contract audited?",
        a: "The CedarX swap contract is currently in development and has not yet undergone a third-party security audit. Trade amounts should reflect this. An audit is planned prior to the production launch of the swap contract.",
      },
      {
        q: "What networks does CedarX use?",
        a: "CedarX supports Ethereum mainnet (L1) and Polygon PoS. Ethereum assets (Fabrica land, 4K luxury goods) settle on Ethereum L1. Polygon assets (Courtyard collectibles) settle on Polygon. Use the network switcher in the header to select your active chain.",
      },
      {
        q: "Are transactions reversible?",
        a: "No. Ethereum transactions are irreversible once confirmed. Review all trade details carefully before approving. CedarX cannot cancel or refund a completed transaction.",
      },
      {
        q: "What are the risks of tokenized real assets?",
        a: (
          <>
            Tokenized real-world assets carry risks including but not limited to:
            <ul className="mt-3 space-y-1.5 list-disc list-inside text-cedar-muted">
              <li>Smart contract vulnerabilities in the underlying protocol</li>
              <li>Legal or regulatory changes affecting asset ownership</li>
              <li>Illiquidity — secondary markets for RWA tokens are thin</li>
              <li>Counterparty risk with custodians and issuers</li>
              <li>Oracle risk for protocols relying on off-chain data</li>
            </ul>
            <p className="mt-3">This is not financial advice. Do your own research.</p>
          </>
        ),
      },
    ],
  },
  {
    heading: "Getting help",
    items: [
      {
        q: "Where can I get support or follow updates?",
        a: (
          <>
            Follow{" "}
            <a href="https://x.com/cedarxio" target="_blank" rel="noopener noreferrer" className="text-cedar-amber hover:text-cedar-amber-lt transition-colors">
              @cedarxio on X
            </a>{" "}
            for product updates and announcements. For protocol-specific questions, refer to the documentation of{" "}
            <a href="https://fabrica.land" target="_blank" rel="noopener noreferrer" className="text-cedar-amber hover:text-cedar-amber-lt transition-colors">Fabrica</a>,{" "}
            <a href="https://4k.io" target="_blank" rel="noopener noreferrer" className="text-cedar-amber hover:text-cedar-amber-lt transition-colors">4K Protocol</a>, or{" "}
            <a href="https://courtyard.io" target="_blank" rel="noopener noreferrer" className="text-cedar-amber hover:text-cedar-amber-lt transition-colors">Courtyard</a>.
          </>
        ),
      },
    ],
  },
];

function FAQRow({ q, a }: FAQItem) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-cedar-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-6 py-5 text-left group"
        aria-expanded={open}
      >
        <span className="font-sans text-sm font-medium text-cedar-text group-hover:text-cedar-amber transition-colors">
          {q}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 mt-0.5 text-cedar-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="pb-6 pr-8 font-sans text-sm text-cedar-muted leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-28 pb-24">
      {/* Header */}
      <div className="mb-16">
        <h1 className="display text-display-md text-cedar-text mb-4">How it works</h1>
        <p className="text-cedar-muted text-sm leading-relaxed max-w-xl">
          CedarX is a non-custodial marketplace for real-world asset NFTs on Ethereum and Polygon. Any ERC-721 or ERC-1155 token representing a verified real-world asset — real estate, luxury goods, art, collectibles — belongs here. Below are answers to common questions about how the platform works, the protocols it indexes, and the risks involved.
        </p>
      </div>

      {/* FAQ sections */}
      <div className="space-y-14">
        {FAQ_SECTIONS.map(({ heading, items }) => (
          <div key={heading}>
            <h2 className="text-cedar-muted text-[11px] tracking-widest uppercase font-sans mb-1">
              {heading}
            </h2>
            <div>
              {items.map((item) => (
                <FAQRow key={item.q} {...item} />
              ))}
            </div>
            {/* Close the last section with a bottom border */}
            <div className="border-t border-cedar-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
