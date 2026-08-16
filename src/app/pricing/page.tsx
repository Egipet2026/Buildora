import Link from "next/link";
import { Notice, PageHeader, SectionHead } from "@/components/ui";
import { getSettings } from "@/lib/data";
import { calculateFees, formatMoney } from "@/lib/money";

export const metadata = {
  title: "Pricing & Fees",
  description:
    "Bizora charges a commission on successful transactions. Listing is free. Featured placement, boosts, verification and subscriptions are optional.",
};

const EXAMPLE_PRICES = [500_000, 2_000_000, 5_000_000, 42_000_000];

export default async function PricingPage() {
  const s = await getSettings();

  const paid = [
    {
      name: "Featured Listing",
      price: formatMoney(s.featured_price_cents),
      period: `${s.featured_days} days`,
      description:
        "Your listing appears in the Featured rails on the home page and at the top of its marketplace. Labelled as paid placement wherever it shows.",
    },
    {
      name: "Boost",
      price: formatMoney(s.boost_price_cents),
      period: `${s.boost_days} days`,
      description:
        "Lifts your listing within whichever sort order a buyer has chosen, without overriding their intent.",
    },
    {
      name: "Premium Seller",
      price: formatMoney(s.premium_monthly_cents),
      period: "per month",
      description:
        "Unlimited active listings, priority moderation, advanced analytics and saved-search alerts.",
    },
    {
      name: "Business Analyzer",
      price: formatMoney(s.analyzer_price_cents),
      period: "per listing",
      description:
        "An AI review of a listing: what is missing, what a buyer will question, and how the numbers compare with similar listings. Indicative only.",
    },
    {
      name: "Advanced Analytics",
      price: "Included with Premium",
      period: "",
      description:
        "Traffic sources, view-to-save conversion, offer history and how your listing performs against its category.",
    },
    {
      name: "Verified Seller",
      price: formatMoney(s.verification_fee_cents),
      period: "one-off",
      description:
        "Identity and company checks, with a badge on your profile and listings. Confirms who you are — never that a deal is a good one.",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title={`${s.commission_bps / 100}% commission. Everything else is optional.`}
        description="Listing on Bizora is free. The platform earns when you do — a commission on completed transactions — plus optional visibility and tooling."
      >
        <Link href="/sell" className="btn btn-brand">
          Create a listing
        </Link>
      </PageHeader>

      <div className="shell py-12">
        {/* ------------------------------------------------------ commission */}
        <div className="card overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 lg:p-10">
              <p className="eyebrow mb-3">Core model</p>
              <h2 className="display text-3xl">
                {s.commission_bps / 100}% on successful transactions
              </h2>
              <p className="mt-4 leading-relaxed text-[var(--color-ink-2)]">
                The commission is deducted from the sale price and the split is
                shown to both sides before anything is finalised. Nothing is
                charged if a listing does not sell.
              </p>
              <p className="mt-4 leading-relaxed text-[var(--color-ink-2)]">
                The same logic applies to businesses, digital assets,
                technologies and licences, services and other marketplace
                transactions.
              </p>
            </div>

            <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)] p-8 lg:border-l lg:border-t-0 lg:p-10">
              <p className="eyebrow mb-5">Worked examples</p>
              <div className="table-wrap">
                <table className="data-table !min-w-0">
                  <thead>
                    <tr>
                      <th>Sale price</th>
                      <th>Platform fee</th>
                      <th>Seller receives</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXAMPLE_PRICES.map((price) => {
                      const fees = calculateFees(price, s.commission_bps);
                      return (
                        <tr key={price}>
                          <td className="font-semibold text-[var(--color-ink)]">
                            {formatMoney(fees.amount_cents)}
                          </td>
                          <td className="text-[var(--color-danger)]">
                            −{formatMoney(fees.fee_cents)}
                          </td>
                          <td className="font-semibold text-[var(--color-accent)]">
                            {formatMoney(fees.net_cents)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Notice tone="gold" title="Payments in this MVP">
            Bizora records transactions and shows the commission split, but does
            not take payment, hold funds or transfer ownership. Holding money on
            behalf of others is a regulated activity — real payments and escrow
            will be enabled through an appropriate marketplace payment provider,
            with the necessary legal and compliance requirements met. Until
            then, settle transfers directly with your own advisers.
          </Notice>
        </div>

        {/* ---------------------------------------------------- paid features */}
        <div className="mt-16">
          <SectionHead
            eyebrow="Optional"
            title="Paid features"
            description="Visibility and tooling you can buy — never a requirement for selling, and never a way to buy a Verified badge you haven't earned."
          />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {paid.map((item) => (
              <div key={item.name} className="card flex flex-col p-6">
                <h3 className="text-[0.9375rem] font-semibold">{item.name}</h3>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="display text-2xl">{item.price}</span>
                  {item.period ? (
                    <span className="text-[0.75rem] text-[var(--color-ink-3)]">
                      / {item.period}
                    </span>
                  ) : null}
                </p>
                <p className="mt-3 flex-1 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[0.8125rem] text-[var(--color-ink-3)]">
            All prices are set in the admin dashboard and can be changed at any
            time. Paid promotion is always labelled on the listing.
          </p>
        </div>

        {/* ------------------------------------------------------------ faq */}
        <div className="mt-16">
          <SectionHead title="Questions sellers ask" />
          <div className="grid gap-5 md:grid-cols-2">
            {[
              {
                q: "When is the commission charged?",
                a: `Only when a transaction completes on the platform. Listing, messaging, receiving offers and negotiating are all free.`,
              },
              {
                q: "Does paying for Featured help my listing sell?",
                a: "It increases how many people see it. It has no effect on whether buyers find the underlying business attractive, and it is always labelled as paid placement.",
              },
              {
                q: "Can I buy a Verified badge?",
                a: "You pay for the checks, not the outcome. If the evidence does not support what your listing claims, the request is rejected and the badge is not issued.",
              },
              {
                q: "Who pays the fee — buyer or seller?",
                a: "The commission is deducted from the sale price, so it comes out of the seller's proceeds. Both sides see the full split before finalising.",
              },
            ].map((item) => (
              <div key={item.q} className="card p-6">
                <h3 className="font-semibold">{item.q}</h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
