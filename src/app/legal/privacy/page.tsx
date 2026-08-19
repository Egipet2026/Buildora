import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated="Placeholder — not yet reviewed"
      sections={[
        {
          heading: "1. What this covers",
          paragraphs: [
            "This describes what personal data Buildora collects, why, and what members can do about it. It is written to reflect how the platform actually behaves, and must be reviewed against the data-protection law of each market before the platform operates commercially.",
          ],
        },
        {
          heading: "2. Data collected",
          list: [
            "Account data: name, email address, password (stored only as a hash by the authentication provider), country.",
            "Profile data: headline, biography, avatar, and anything else you choose to publish.",
            "Listing data: everything you enter into a listing, including financial figures and documents you upload.",
            "Transaction data: offers, counter-offers, and records of transactions including amounts and the commission split.",
            "Messages: the content of conversations between members on the platform.",
            "Verification data: evidence you submit when requesting verification, including identity and company documents.",
            "Technical data: standard server logs and session cookies needed to keep you signed in.",
          ],
        },
        {
          heading: "3. How it is used",
          list: [
            "To operate your account and show your listings to other members.",
            "To deliver messages, offers and notifications between members.",
            "To moderate listings and investigate reports of prohibited conduct.",
            "To carry out verification checks that you have requested.",
            "To calculate and display fees, and to keep records of transactions.",
          ],
        },
        {
          heading: "4. What other members can see",
          paragraphs: [
            "Your name, country, headline, verification status and your published listings are visible to other members and to visitors.",
            "Your email address is never shown to other members by default. Messaging runs through the platform so contact details do not need to be exchanged to start a conversation.",
            "Offers are visible only to the two parties to the negotiation and to platform administrators. Documents attached to a listing are private and released only on the terms the seller sets.",
          ],
        },
        {
          heading: "5. Storage and security",
          paragraphs: [
            "Data is stored in a Postgres database with row-level security, so a query can only return rows the requesting account is entitled to see. Documents are held in a private storage bucket and served through short-lived signed links rather than public URLs.",
            "Passwords are handled by the authentication provider and are never stored by the application. Access to administrative functions is restricted by role and enforced at the database layer as well as in the interface.",
          ],
        },
        {
          heading: "6. Your rights",
          paragraphs: [
            "Depending on where you live you may have rights to access, correct, export, restrict the use of, or delete your personal data, and to object to certain processing. The exact rights, the process for exercising them, and the response deadlines will be set out here once this document has been reviewed by a qualified professional.",
          ],
        },
        {
          heading: "7. Retention",
          paragraphs: [
            "Account and listing data is kept while your account is open. Transaction records may be kept longer where required by law. Verification evidence should be kept no longer than necessary to complete and evidence the check.",
          ],
        },
        {
          heading: "8. Contact",
          paragraphs: [
            "A data controller identity, postal address, contact route and supervisory-authority details must be added here before the platform processes personal data commercially.",
          ],
        },
      ]}
    />
  );
}
