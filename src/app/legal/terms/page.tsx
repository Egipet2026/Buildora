import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      updated="Placeholder — not yet reviewed"
      sections={[
        {
          heading: "1. What Bizora is",
          paragraphs: [
            "Bizora is an online marketplace. It provides a venue where people can advertise businesses, intellectual property, digital assets, services and partnership opportunities, and where other people can find and contact them.",
            "Bizora is not a party to any transaction between members. It is not a broker, an agent, an adviser, an auctioneer, a bank, a payment institution or an escrow provider. It does not act for a buyer or a seller and does not represent either side.",
          ],
        },
        {
          heading: "2. What Bizora does not promise",
          paragraphs: [
            "Bizora does not guarantee that any business advertised on the platform is profitable, solvent, lawfully operated or accurately described.",
            "Bizora does not guarantee that any patent, application, technology or other intellectual property is valid, enforceable, owned by the person offering it, free of third-party rights, or commercially useful.",
            "Bizora does not guarantee that any transaction will complete, that any seller or buyer is reliable, or that any listing represents a good decision.",
            "Nothing on the platform is financial, investment, legal, tax or accounting advice. Take independent professional advice before entering into any transaction.",
          ],
        },
        {
          heading: "3. Accounts",
          paragraphs: [
            "You must give accurate registration information and keep it up to date. You are responsible for everything done through your account and for keeping your credentials secure.",
            "You must be legally capable of entering into contracts in your jurisdiction. Accounts may be suspended or closed where these terms or the Marketplace Rules are breached.",
          ],
        },
        {
          heading: "4. Listings",
          paragraphs: [
            "You may only list something you own or are authorised to sell or license. You are responsible for the accuracy of everything in your listing, including financial figures, ownership claims and the legal status of any intellectual property.",
            "Listings are reviewed before publication. Review is a basic check for obvious problems — it is not an audit, a valuation or verification of your claims, and approval does not mean Bizora agrees with anything you have written.",
            "Listings may be edited, rejected, suspended or removed at any time, in particular where they are misleading, unlawful, or breach the Marketplace Rules.",
          ],
        },
        {
          heading: "5. Offers and transactions",
          paragraphs: [
            "Offers and counter-offers made through Bizora are expressions of interest that open a negotiation. They are not binding contracts, and accepting an offer on the platform does not create a contract of sale.",
            "Any binding agreement is made directly between the buyer and the seller, on terms they agree separately and in writing. Transfers of companies, shares, assets, intellectual property and licences are subject to the law that applies to them, which usually requires formalities Bizora does not provide.",
          ],
        },
        {
          heading: "6. Fees",
          paragraphs: [
            "Creating a listing is free. Bizora charges a commission on completed transactions at the rate published on the Pricing page, which is shown to both parties before a transaction is finalised.",
            "Optional paid features — featured placement, boosts, subscriptions and verification services — are charged as published. Paid placement buys visibility only; it does not affect how a listing is described or reviewed, and it is labelled wherever it appears.",
          ],
        },
        {
          heading: "7. Payments in this version",
          paragraphs: [
            "This version of Bizora does not process payments. It records the amount a buyer and seller have agreed and the commission split, so both sides see the same figures. It does not take payment, hold funds, operate escrow or transfer ownership.",
            "Real payments will only be enabled through an appropriately authorised payment provider, and only once the applicable legal, regulatory and compliance requirements are met.",
          ],
        },
        {
          heading: "8. Prohibited use",
          paragraphs: [
            "You must not use Bizora to offer securities, shares, investment opportunities or any other regulated financial product; to launder money or evade sanctions; to sell anything you do not have the right to sell; to make guaranteed-return claims; or to mislead other members.",
            "The Marketplace Rules form part of these terms and set out prohibited conduct in more detail.",
          ],
        },
        {
          heading: "9. Liability",
          paragraphs: [
            "To the extent permitted by law, Bizora is not liable for losses arising from a transaction between members, from reliance on information in a listing, or from the conduct of any member.",
            "Nothing in these terms excludes liability that cannot lawfully be excluded, including liability for death or personal injury caused by negligence, or for fraud.",
          ],
        },
        {
          heading: "10. Changes and governing law",
          paragraphs: [
            "These terms may be updated. Material changes will be notified to members before they take effect.",
            "The governing law and the courts with jurisdiction will be specified here once this document has been reviewed by a qualified legal professional for each market in which the platform operates.",
          ],
        },
      ]}
    />
  );
}
