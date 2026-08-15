import { SettingsForm } from "@/components/admin-actions";
import { Notice } from "@/components/ui";
import { getSettings } from "@/lib/data";
import { calculateFees, formatMoney } from "@/lib/money";

export const metadata = { title: "Platform settings" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const example = calculateFees(5_000_000, settings.commission_bps);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SettingsForm settings={settings} />

      <aside className="space-y-5">
        <div className="card p-6">
          <p className="eyebrow mb-4">Current split on €50,000</p>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-[0.875rem] text-[var(--color-ink-3)]">
                Sale price
              </dt>
              <dd className="font-semibold">
                {formatMoney(example.amount_cents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[0.875rem] text-[var(--color-ink-3)]">
                Platform fee
              </dt>
              <dd className="font-semibold text-[var(--color-danger)]">
                {formatMoney(example.fee_cents)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-[var(--color-line)] pt-3">
              <dt className="text-[0.875rem] font-medium">Seller receives</dt>
              <dd className="display text-xl text-[var(--color-accent)]">
                {formatMoney(example.net_cents)}
              </dd>
            </div>
          </dl>
        </div>

        <Notice tone="gold" title="Changing the commission">
          Raising the rate affects listings already published and buyers already
          negotiating. Give sellers notice before a change, and honour the rate
          quoted on any deal already in progress.
        </Notice>

        <Notice tone="neutral" title="Payments">
          Payment provider, escrow and payout settings appear here once a
          regulated marketplace payment provider is integrated. The data model
          already carries the fee split per transaction, so enabling payouts is
          a provider integration rather than a schema change.
        </Notice>
      </aside>
    </div>
  );
}
