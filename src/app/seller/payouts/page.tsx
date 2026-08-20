import { redirect } from "next/navigation";
import { PageHeader, Notice } from "@/components/ui";
import { PayoutSetup } from "@/components/payout-setup";
import { getCurrentUser, getSettings } from "@/lib/data";
import { refreshPayoutStatus } from "@/lib/payments/checkout";
import { paymentsEnabled, isTestMode } from "@/lib/payments/stripe";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const settings = await getSettings();
  // Stripe is the authority on whether this seller may be paid, and onboarding
  // finishes on Stripe's side — so the answer is refreshed when the page is
  // opened rather than waiting for a webhook that may not have arrived yet.
  const enabled = paymentsEnabled() ? await refreshPayoutStatus(me) : false;
  const started = Boolean(me.stripe_account_id);

  return (
    <>
      <PageHeader
        eyebrow="Selling"
        title="Getting paid"
        description="Buyers pay by card. Stripe settles the money to your own account and takes the platform's commission on the way past — Buildora never holds your money."
      />

      <div className="shell grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {!paymentsEnabled() ? (
            <Notice tone="gold" title="Card payments are not switched on here">
              This deployment has no payment provider connected, so nothing on
              the site can take a card. Buyers and sellers agree payment between
              themselves in the meantime.
            </Notice>
          ) : (
            <PayoutSetup started={started} enabled={enabled} />
          )}

          {isTestMode() ? (
            <Notice tone="brand" title="Stripe is in test mode">
              Payments here use Stripe&apos;s test keys. Cards are not charged
              and no money moves — use Stripe&apos;s test card 4242 4242 4242
              4242 with any future expiry date.
            </Notice>
          ) : null}

          <Notice tone="gold" title="What Buildora does and does not do">
            Buildora introduces buyers and sellers and takes a commission on a
            completed sale. It is not an escrow service, it does not hold funds
            and it does not guarantee that what is sold matches its
            description. Payment reaching your account is not confirmation that
            the transfer of a business, a domain, a patent or any other asset
            has actually taken place — that is between you and the buyer, and
            worth putting in writing.
          </Notice>
        </div>

        <aside className="space-y-5">
          <div className="card p-6">
            <p className="eyebrow mb-4">On a sale of {formatMoney(5_000_000)}</p>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-[0.875rem] text-[var(--color-ink-3)]">
                  Buyer pays
                </dt>
                <dd className="font-semibold">{formatMoney(5_000_000)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[0.875rem] text-[var(--color-ink-3)]">
                  Buildora commission
                </dt>
                <dd className="font-semibold text-[var(--color-danger)]">
                  {formatMoney((5_000_000 * settings.commission_bps) / 10_000)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] pt-3">
                <dt className="text-[0.875rem] font-medium">You receive</dt>
                <dd className="display text-xl text-[var(--color-accent)]">
                  {formatMoney(5_000_000 - (5_000_000 * settings.commission_bps) / 10_000)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 hairline pt-4 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
              Stripe&apos;s own card processing fee is deducted separately by
              Stripe and is not shown here.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
