import { integrationStatuses } from "@/lib/integrations";

/**
 * Which services this deployment is wired to, read from the running server.
 *
 * Only the owner and admins reach this page. Even so it reports presence and
 * nothing else — no keys, no prefixes, no provider error messages.
 */
export function IntegrationsPanel() {
  const statuses = integrationStatuses();
  const missing = statuses.filter((s) => !s.connected).length;

  return (
    <div className="card p-6">
      <p className="eyebrow mb-1">Connections</p>
      <p className="mb-4 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
        {missing === 0
          ? "Everything is connected."
          : `${missing} of ${statuses.length} not connected. Until each is, that part of the site falls back to something that works without it.`}
      </p>

      <ul className="space-y-4">
        {statuses.map((s) => (
          <li key={s.name} className="hairline pt-4 first:border-0 first:pt-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{s.name}</span>
              <span
                className={`badge ${s.connected ? "badge-accent" : "badge-neutral"}`}
              >
                {s.connected ? "Connected" : "Not connected"}
              </span>
            </div>
            <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-2)]">
              {s.detail}
            </p>
            <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
              {s.purpose}
            </p>
            {s.warning ? (
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--color-danger)]">
                {s.warning}
              </p>
            ) : null}
            {!s.connected && s.variable ? (
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                Set <code className="font-mono">{s.variable}</code> where the
                site is hosted, then redeploy — a value saved after a build is
                not picked up until the next one.
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
