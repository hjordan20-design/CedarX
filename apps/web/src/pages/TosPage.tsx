import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "March 21, 2026";

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: (
      <>
        <p>
          By accessing or using the CedarX marketplace ("CedarX," "we," "us," or "our"),
          you agree to be bound by these Terms of Service ("Terms"). If you do not agree to
          these Terms, do not use CedarX.
        </p>
        <p>
          These Terms apply to all visitors, users, and others who access or use the
          CedarX interface at cedarx.io and any associated subdomains.
        </p>
      </>
    ),
  },
  {
    id: "description",
    title: "2. Description of Service",
    content: (
      <>
        <p>
          CedarX is a non-custodial, decentralized marketplace that allows users to
          discover, buy, and sell non-fungible tokens (NFTs) representing verified
          real-world assets ("RWA NFTs"), including but not limited to real estate parcels,
          luxury goods, artwork, and collectibles.
        </p>
        <p>
          CedarX does not hold, transfer, or custody any assets on behalf of users.
          All transactions are executed directly by users through their own self-custody
          wallets on the Ethereum blockchain.
        </p>
        <p>
          CedarX indexes and displays on-chain data from third-party RWA protocols
          including Fabrica, Propy, and Roofstock onChain. We are not affiliated with
          these protocols and do not represent, warrant, or guarantee the accuracy of
          information provided by them.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "3. Eligibility",
    content: (
      <>
        <p>
          To use CedarX you must be at least 18 years of age and have the legal capacity
          to enter into binding agreements in your jurisdiction. By using CedarX you
          represent and warrant that you meet these requirements.
        </p>
        <p>
          CedarX is not available to users in jurisdictions where the purchase or sale
          of tokenized real-world assets is prohibited by applicable law. You are solely
          responsible for determining whether your use of CedarX is lawful in your
          jurisdiction.
        </p>
      </>
    ),
  },
  {
    id: "wallet",
    title: "4. Wallet & Account Responsibility",
    content: (
      <>
        <p>
          CedarX does not create or manage user accounts. Access is provided exclusively
          through self-custody Ethereum wallets ("wallets"). You are solely responsible for:
        </p>
        <ul>
          <li>Maintaining the security of your wallet's private keys and seed phrases.</li>
          <li>All transactions submitted from your wallet address.</li>
          <li>Any losses resulting from unauthorized access to your wallet.</li>
        </ul>
        <p>
          CedarX has no ability to reverse, cancel, or modify any on-chain transaction.
          All transactions are final once confirmed on the Ethereum blockchain.
        </p>
      </>
    ),
  },
  {
    id: "transactions",
    title: "5. Asset Listings and Transactions",
    content: (
      <>
        <p>
          When you purchase an RWA NFT through CedarX, you are acquiring the NFT token
          itself. Legal title to the underlying physical asset is governed entirely by the
          issuing protocol's legal framework, the applicable jurisdiction's property law,
          and any associated legal agreements between you and the relevant parties.
        </p>
        <p>
          CedarX makes no representation that:
        </p>
        <ul>
          <li>The NFT confers legal title to any physical asset.</li>
          <li>The asset description, images, or metadata are accurate or complete.</li>
          <li>The issuing protocol has completed all required legal steps to tokenize the asset.</li>
          <li>The asset is free from liens, encumbrances, or third-party claims.</li>
        </ul>
        <p>
          Buyers are solely responsible for conducting due diligence before purchasing any
          RWA NFT, including reviewing the issuing protocol's documentation and consulting
          independent legal counsel where appropriate.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    title: "6. Marketplace Fees",
    content: (
      <>
        <p>
          CedarX charges a marketplace fee of 1% on the gross sale price of each
          completed transaction. This fee is deducted automatically from the USDC
          payment at the time of settlement.
        </p>
        <p>
          Users are also responsible for all Ethereum network gas fees incurred in
          connection with transactions, approvals, and listings. Gas fees are set by
          the Ethereum network and are not controlled or received by CedarX.
        </p>
        <p>
          Fee rates may be updated with reasonable advance notice. The current fee
          is always shown at the time of purchase.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "7. Intellectual Property",
    content: (
      <>
        <p>
          The CedarX interface, design, code, and branding are owned by CedarX and
          protected by applicable intellectual property laws. You may not reproduce,
          distribute, or create derivative works without our written permission.
        </p>
        <p>
          NFT images and metadata displayed on CedarX are sourced from third-party
          protocols and on-chain data. CedarX does not claim ownership of this content.
        </p>
      </>
    ),
  },
  {
    id: "risks",
    title: "8. Risks and Disclaimers",
    content: (
      <>
        <p>
          Using CedarX involves significant risks, including but not limited to:
        </p>
        <ul>
          <li>
            <strong>Smart contract risk.</strong> The CedarX swap contract has not yet
            been formally audited. Bugs or vulnerabilities could result in loss of funds.
          </li>
          <li>
            <strong>Price volatility.</strong> The value of RWA NFTs may fluctuate
            significantly. Past transaction prices are not indicative of future value.
          </li>
          <li>
            <strong>Liquidity risk.</strong> RWA NFT markets may be illiquid. You may
            not be able to sell an asset at your desired price or at all.
          </li>
          <li>
            <strong>Regulatory risk.</strong> Laws governing tokenized real-world assets
            are evolving. Future regulations may affect the legality or value of RWA NFTs.
          </li>
          <li>
            <strong>Protocol risk.</strong> Third-party protocols may change, pause, or
            discontinue their services, affecting the legal rights associated with
            their NFTs.
          </li>
          <li>
            <strong>Network risk.</strong> Ethereum network congestion, forks, or outages
            may prevent or delay transactions.
          </li>
        </ul>
        <p>
          CedarX is provided "as is" and "as available" without warranty of any kind,
          express or implied.
        </p>
      </>
    ),
  },
  {
    id: "no-investment-advice",
    title: "9. No Investment Advice",
    content: (
      <p>
        Nothing on CedarX constitutes investment, financial, legal, or tax advice.
        All information is provided for informational purposes only. You should consult
        qualified professionals before making any investment or purchasing decision
        involving tokenized assets.
      </p>
    ),
  },
  {
    id: "liability",
    title: "10. Limitation of Liability",
    content: (
      <>
        <p>
          To the maximum extent permitted by law, CedarX and its affiliates, officers,
          directors, employees, and agents will not be liable for any indirect, incidental,
          special, consequential, or punitive damages, including loss of profits, loss of
          data, or loss of digital assets, arising out of or relating to your use of
          CedarX, even if we have been advised of the possibility of such damages.
        </p>
        <p>
          Our total liability to you for any claim arising from these Terms or your use
          of CedarX will not exceed the marketplace fees you paid to us in the three months
          preceding the claim.
        </p>
      </>
    ),
  },
  {
    id: "disputes",
    title: "11. Dispute Resolution",
    content: (
      <>
        <p>
          These Terms are governed by the laws of the State of Delaware, United States,
          without regard to conflict of law principles. Any disputes arising under these
          Terms will be resolved through binding arbitration administered by the American
          Arbitration Association under its Commercial Arbitration Rules.
        </p>
        <p>
          You waive any right to participate in class action lawsuits or class-wide
          arbitration against CedarX.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "12. Changes to These Terms",
    content: (
      <p>
        We may update these Terms from time to time. We will notify users of material
        changes by updating the effective date at the top of this page. Your continued
        use of CedarX after any changes constitutes acceptance of the updated Terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "13. Contact",
    content: (
      <p>
        For questions about these Terms, contact us at{" "}
        <a
          href="https://x.com/cedarxio"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cedar-amber hover:underline"
        >
          @cedarxio
        </a>{" "}
        on X (Twitter).
      </p>
    ),
  },
];

export function TosPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-cedar-muted hover:text-cedar-text text-sm mb-10 transition-colors"
      >
        <ArrowLeft size={14} /> Back to CedarX
      </Link>

      {/* Header */}
      <div className="mb-10 pb-8 border-b border-cedar-border">
        <h1 className="display text-4xl text-cedar-text mb-3">Terms of Service</h1>
        <p className="text-cedar-muted text-sm">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-cedar-text font-sans font-semibold text-base mb-4">
              {section.title}
            </h2>
            <div className="space-y-4 text-cedar-muted text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-cedar-text">
              {section.content}
            </div>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-16 pt-8 border-t border-cedar-border">
        <p className="text-cedar-muted/50 text-xs">
          These Terms of Service were last updated on {EFFECTIVE_DATE}. By using CedarX
          you acknowledge that you have read, understood, and agreed to these Terms.
        </p>
      </div>
    </div>
  );
}
