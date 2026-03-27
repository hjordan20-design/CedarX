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
        a: "CedarX is a peer-to-peer marketplace for tokenized land on Ethereum. We index Fabrica land tokens — real US property deeds on-chain — and let you buy, sell, and make offers using USDC.",
      },
      {
        q: "What kind of land is on CedarX?",
        a: "CedarX lists land parcels tokenized through the Fabrica protocol. These are raw land parcels, rural properties, and agricultural land across the United States. Each token represents full legal ownership of a real property deed.",
      },
      {
        q: "Is CedarX a broker or custodian?",
        a: "No. CedarX never holds your tokens or your funds. All trades are peer-to-peer, executed by non-custodial smart contracts on Ethereum. The deed token stays in the seller's wallet until the moment of settlement.",
      },
      {
        q: "Who is CedarX for?",
        a: "Anyone with an Ethereum-compatible wallet who wants to buy, sell, or make offers on tokenized land — without going through a broker, title company, or escrow. There are no accounts to create and no KYC at the marketplace level.",
      },
    ],
  },
  {
    heading: "Buying land",
    items: [
      {
        q: "How does a purchase work?",
        a: (
          <>
            When you click Buy, CedarX routes the order through a non-custodial swap contract. The flow is:
            <ol className="mt-3 space-y-2 list-decimal list-inside text-cedar-muted">
              <li>You approve a USDC transfer for the listing price.</li>
              <li>The swap contract executes — transferring the deed token to your wallet and USDC to the seller, atomically in one transaction.</li>
              <li>If either side of the transfer fails, the entire transaction reverts. You never lose funds to a partial fill.</li>
            </ol>
          </>
        ),
      },
      {
        q: "What does 'For Sale' mean?",
        a: "A parcel marked 'For Sale' has been listed by its owner at a fixed price via a Seaport order. Click Buy, approve the USDC payment in your wallet, and the deed token transfers to you instantly.",
      },
      {
        q: "What does 'Make Offer' mean?",
        a: "A parcel showing 'Make Offer' is not currently listed for sale. You can still submit a USDC offer directly to the owner. If the owner accepts onchain, the trade settles automatically. Your wallet signs the offer off-chain — no gas is needed until the owner accepts.",
      },
      {
        q: "What wallets are supported?",
        a: "MetaMask, Coinbase Wallet, and any WalletConnect v2-compatible wallet. CedarX operates on Ethereum mainnet — make sure your wallet is connected to Ethereum before browsing or buying.",
      },
      {
        q: "What is the payment token?",
        a: "All CedarX trades settle in USDC on Ethereum mainnet.",
      },
    ],
  },
  {
    heading: "What you're buying",
    items: [
      {
        q: "What is a Fabrica token?",
        a: "A Fabrica token (ERC-721) represents full legal ownership of a US land parcel. The deed is held by a Wyoming LLC whose sole member is the token holder. Owning the token equals owning the land, with all legal rights that entails.",
      },
      {
        q: "How does Fabrica ownership work legally?",
        a: (
          <>
            When you buy a Fabrica token:
            <ol className="mt-3 space-y-2 list-decimal list-inside text-cedar-muted">
              <li>The seller transfers the ERC-721 token to your wallet on Ethereum.</li>
              <li>The underlying Wyoming LLC — which holds the property deed — automatically recognizes the new token holder as its sole member.</li>
              <li>You are now the legal owner of the land parcel.</li>
            </ol>
            <p className="mt-3">Consult a licensed attorney for advice on property ownership in your jurisdiction.</p>
          </>
        ),
      },
      {
        q: "What details are shown for each parcel?",
        a: "Each listing shows the property address, acreage, county, state, and parcel ID where available. Satellite imagery and map location are displayed when coordinates are available.",
      },
      {
        q: "Can I visit or inspect the property?",
        a: "Yes. The parcel location is public information. CedarX shows the address and map — you can visit in person or hire a surveyor before purchasing. CedarX does not guarantee the condition or suitability of any property.",
      },
    ],
  },
  {
    heading: "Selling & tokenizing land",
    items: [
      {
        q: "Can I list my Fabrica land for sale on CedarX?",
        a: "Yes. If you hold a Fabrica token in your wallet, visit the Sell page to create a Seaport listing. Set your price in USDC and sign the order — it will appear on CedarX immediately and be simultaneously visible on OpenSea.",
      },
      {
        q: "How do I tokenize land I own?",
        a: "If you own a land parcel and want to tokenize it through Fabrica, visit the Tokenize page on CedarX to submit a request. We will connect you with Fabrica's tokenization process.",
      },
      {
        q: "Are CedarX listings visible on other marketplaces?",
        a: "Yes. Listings created on CedarX use the Seaport protocol and are simultaneously visible on OpenSea and any other Seaport-compatible marketplace.",
      },
    ],
  },
  {
    heading: "Risk & security",
    items: [
      {
        q: "Is the CedarX smart contract audited?",
        a: "The CedarX swap contract is currently in development and has not yet undergone a third-party security audit. An audit is planned prior to the full production launch.",
      },
      {
        q: "Are transactions reversible?",
        a: "No. Ethereum transactions are irreversible once confirmed. Review all trade details carefully before approving. CedarX cannot cancel or refund a completed transaction.",
      },
      {
        q: "What are the risks of tokenized land?",
        a: (
          <>
            Tokenized land carries risks including but not limited to:
            <ul className="mt-3 space-y-1.5 list-disc list-inside text-cedar-muted">
              <li>Smart contract vulnerabilities in the Fabrica protocol</li>
              <li>Legal or regulatory changes affecting tokenized property ownership</li>
              <li>Illiquidity — secondary markets for land tokens are thin</li>
              <li>Title disputes or encumbrances on the underlying parcel</li>
              <li>Environmental or zoning restrictions on land use</li>
            </ul>
            <p className="mt-3">This is not legal or financial advice. Consult appropriate professionals before purchasing real property.</p>
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
            for product updates and announcements. For protocol-specific questions, refer to the{" "}
            <a href="https://fabrica.land" target="_blank" rel="noopener noreferrer" className="text-cedar-amber hover:text-cedar-amber-lt transition-colors">Fabrica documentation</a>.
            Email us at{" "}
            <a href="mailto:hello@cedarx.io" className="text-cedar-amber hover:text-cedar-amber-lt transition-colors">hello@cedarx.io</a>.
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
          CedarX is a non-custodial marketplace for tokenized land on Ethereum. Buy and sell real US property deeds through the Fabrica protocol — no broker, no escrow, no intermediaries. Below are answers to common questions.
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
