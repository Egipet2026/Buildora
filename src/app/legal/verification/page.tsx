import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "About Verification" };

export default function VerificationInfoPage() {
  return (
    <LegalDoc
      title="What verification means"
      updated="Placeholder — not yet reviewed"
      sections={[
        {
          heading: "The short version",
          paragraphs: [
            "A Verified badge means Buildora checked specific facts a member gave us, against evidence they supplied and against public records, so far as we can lawfully check them.",
            "It is not an audit, a valuation, a credit check, a legal opinion, or a statement that a transaction is a good idea. A verified listing can still be a bad purchase.",
          ],
        },
        {
          heading: "Verified Seller",
          list: [
            "Checked: that the person or company exists, that the identity documents provided are consistent, and that the member is connected to the company they claim to represent.",
            "Not checked: their competence, their solvency, their trading history, or whether they will behave well in a negotiation.",
          ],
        },
        {
          heading: "Verified Business",
          list: [
            "Checked: that the specific evidence supplied — accounts, merchant or processor statements, analytics access, domain ownership — is consistent with the headline figures in the listing.",
            "Not checked: whether the business will continue to perform, whether it has undisclosed liabilities, or whether the asking price is reasonable.",
          ],
        },
        {
          heading: "Verified Patent or Technology",
          list: [
            "Checked: that the patent or application number exists, and that the jurisdiction, filing date, current legal status and recorded proprietor match the relevant public register.",
            "Not checked: validity, enforceability, claim scope, freedom to operate, whether the rights are encumbered, or what the technology is worth. Those questions require a qualified patent attorney.",
          ],
        },
        {
          heading: "Paying for verification",
          paragraphs: [
            "The verification fee pays for the checks, not for the badge. If the evidence does not support what a listing claims, the request is rejected and no badge is issued. Verification cannot be bought, and paid placement — Featured or Boost — never affects whether a listing is verified.",
          ],
        },
        {
          heading: "If something looks wrong",
          paragraphs: [
            "Verification can be withdrawn at any time, including after a listing has gone live. If you believe a verified listing is inaccurate, report it — reports are reviewed by the platform team and the reporter is not identified to the member reported.",
          ],
        },
      ]}
    />
  );
}
