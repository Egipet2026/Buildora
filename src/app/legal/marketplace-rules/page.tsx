import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "Marketplace Rules" };

export default function RulesPage() {
  return (
    <LegalDoc
      title="Marketplace Rules"
      updated="Placeholder — not yet reviewed"
      sections={[
        {
          heading: "1. Be accurate",
          list: [
            "Only publish figures you can evidence. Expect to be asked for statements, accounts or analytics access.",
            "Do not present projections, targets or best months as historic performance.",
            "Do not claim or imply guaranteed returns, guaranteed profits or a guaranteed sale.",
            "Correct your listing promptly if something material changes.",
          ],
        },
        {
          heading: "2. Only sell what is yours",
          list: [
            "List only what you own or are authorised to sell or license, and be ready to evidence that authority.",
            "Do not offer intellectual property you do not hold rights to, and do not offer rights more broadly than you actually hold them.",
            "State the true legal status of any patent or application. A pending application must be described as pending — never as a granted patent.",
            "Do not imply that BizHub has assessed the validity, enforceability, scope or value of any intellectual property.",
          ],
        },
        {
          heading: "3. No regulated offerings",
          paragraphs: [
            "BizHub does not host offers of securities, shares, bonds, fund interests, tokens or other regulated financial products, and does not host solicitations of investment.",
            "Partner listings are for people who will work together. A listing that is in substance an offer of an investment return will be removed, regardless of how it is worded.",
          ],
        },
        {
          heading: "4. Keep it on the platform",
          list: [
            "Negotiate through BizHub so both sides keep a record.",
            "Do not pressure anyone to move a negotiation off-platform early to avoid fees or scrutiny.",
            "Never ask for or share passwords, one-time codes, or full payment credentials in a message.",
          ],
        },
        {
          heading: "5. Prohibited conduct",
          list: [
            "Fraud, misrepresentation, impersonation, or fake listings and reviews.",
            "Money laundering, sanctions evasion, or transactions involving proceeds of crime.",
            "Spam, mass unsolicited outreach, or scraping other members' details.",
            "Harassment, discrimination, threats, or abusive messages.",
            "Uploading malware, or documents containing other people's personal data without a lawful basis.",
          ],
        },
        {
          heading: "6. Moderation and enforcement",
          paragraphs: [
            "Every listing is reviewed before publication. Review looks for obvious problems — it is not an audit, and approval does not mean BizHub endorses or has confirmed a listing.",
            "Listings may be edited, rejected, suspended or removed, and accounts may be restricted or blocked, where these rules are breached. Where a listing is rejected, the seller is told why so they can correct it.",
            "Any member can report a listing, a member or a message. Reports are reviewed by the platform team and the reporter's identity is not disclosed to the person reported.",
          ],
        },
        {
          heading: "7. Due diligence is yours",
          paragraphs: [
            "Buyers are responsible for their own due diligence. Verify financials, ownership, contracts, liabilities and intellectual property independently, and take legal, tax and financial advice appropriate to the transaction and to every jurisdiction it touches.",
          ],
        },
      ]}
    />
  );
}
