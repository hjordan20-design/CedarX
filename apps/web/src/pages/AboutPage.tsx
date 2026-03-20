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
        a: "CedarX is a peer-to-peer marketplace for tokenized real-world assets on Ethereum. We index listings from protocols like Fabrica (land), Ondo Finance (fixed income), and RealT (rental property), and let you buy and sell them in one place using USDC.",
      },
      {
        q: "Who is CedarX for?",
        a: "Anyone with an Ethereum wallet who wants exposure to real-world assets onchain — without going through a broker, fund, or custodian. CedarX is a permissionless interface. There are no accounts to create and no KYC at the marketplace level, though individual asset protocols may have their own eligibility requirements.",
      },
      {
        q: "Is CedarX a custodian?",
        a: "No. CedarX never holds your tokens or your funds. All trades are peer-to-peer, executed by a non-custodial smart contract on Ethereum L1. Tokens stay in sellers' wallets until the moment of settlement.",
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
        a: "MetaMask, Coinbase Wallet, and any WalletConnect v2-compatible wallet. If your wallet can sign Ethereum transactions, it works with CedarX.",
      },
      {
        q: "What is the payment token?",
        a: "All trades settle in USDC on Ethereum mainnet. You'll need USDC in your connected wallet to buy assets. Sellers receive USDC directly — no wrapping or bridging required.",
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
    heading: "The protocols",
    items: [
      {
        q: "What is Fabrica?",
        a: "Fabrica is a protocol that tokenizes real property deeds on Ethereum. Each Fabrica token represents full legal ownership of a US land parcel, backed by a deed held in a Wyoming LLC. Ownership of the token equals ownership of the land.",
      },
      {
        q: "What is Ondo Finance?",
        a: "Ondo Finance issues tokenized US Treasury instruments on Ethereum. Their OUSG and USDY tokens are yield-bearing and backed by short-duration government securities held by qualified custodians. Access may be restricted to accredited investors in certain jurisdictions.",
      },
      {
        q: "What is RealT?",
        a: "RealT fractionalizes residential rental properties into ERC-20 tokens. Each token entitles the holder to a proportional share of rental income, distributed weekly in USDC directly to your wallet.",
      },
      {
        q: "Are there eligibility requirements for individual assets?",
        a: "Yes — each underlying protocol has its own requirements. Ondo Finance assets are typically restricted to non-US persons or accredited US investors. Fabrica land tokens have no general restrictions. RealT has jurisdiction-specific rules. CedarX displays these requirements on each listing. It is your responsibility to verify eligibility before purchasing.",
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
        q: "What network does CedarX use?",
        a: "Ethereum mainnet (L1). CedarX does not currently support Layer 2 networks. All assets and USDC settlements occur on Ethereum L1.",
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
            <a
              href="https://x.com/cedarxio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cedar-amber hover:text-cedar-amber-lt transition-colors"
            >
              @cedarxio on X
            </a>{" "}
            for product updates and announcements. For protocol-specific questions, refer to the documentation of{" "}
            <a href="https://fabrica.land" target="_blank" rel="noopener noreferrer" className="text-cedar-amber hover:text-cedar-amber-lt transition-colors">Fabrica</a>,{" "}
            <a href="https://ondo.finance" target="_blank" rel="noopener noreferrer" className="text-cedar-amber hover:text-cedar-amber-lt transition-colors">Ondo Finance</a>, or{" "}
            <a href="https://realt.co" target="_blank" rel="noopener noreferrer" className="text-cedar-amber hover:text-cedar-amber-lt transition-colors">RealT</a>.
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
          CedarX is a non-custodial marketplace for tokenized real-world assets on Ethereum. Below are answers to common questions about how the platform works, the protocols it indexes, and the risks involved.
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
