import { formatMoney } from "@/lib/money";

/**
 * A small multi-series line chart, drawn as inline SVG.
 *
 * No charting library: the shape of this data is fixed and simple, and a
 * dependency that ships a rendering engine to every visitor is a poor trade
 * for four polylines. It scales with its container and is described in text
 * underneath for anyone who cannot see it.
 */

export interface Series {
  label: string;
  colour: string;
  /** One value per point, aligned with `labels`. */
  values: number[];
  /** Money is drawn in cents and labelled in euros. */
  money?: boolean;
}

export function TrendChart({
  labels,
  series,
  height = 220,
}: {
  labels: string[];
  series: Series[];
  height?: number;
}) {
  if (!labels.length || !series.length) return null;

  const width = 640;
  const pad = { top: 16, right: 16, bottom: 28, left: 8 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1);
  // Always anchor at zero: a truncated axis exaggerates every movement.
  const x = (i: number) =>
    pad.left + (labels.length === 1 ? plotW / 2 : (i / (labels.length - 1)) * plotW);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;

  const format = (value: number, money?: boolean) =>
    money ? formatMoney(value) : value.toLocaleString("en-IE");

  return (
    <figure className="m-0">
      <div className="table-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[420px]"
          role="img"
          aria-label={`${series.map((s) => s.label).join(", ")} from ${labels[0]} to ${labels.at(-1)}`}
        >
          {/* Horizontal guides at quarters of the maximum. */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={pad.left}
              x2={width - pad.right}
              y1={y(max * f)}
              y2={y(max * f)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
          ))}

          {series.map((s) => (
            <g key={s.label}>
              <polyline
                fill="none"
                stroke={s.colour}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={s.colour} />
              ))}
            </g>
          ))}

          {labels.map((label, i) => (
            <text
              key={label}
              x={x(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-ink-3)"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {series.map((s) => (
          <span
            key={s.label}
            className="flex items-center gap-2 text-[0.8125rem] text-[var(--color-ink-2)]"
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: s.colour }}
            />
            {s.label}
            <span className="text-[var(--color-ink-3)]">
              {format(s.values.at(-1) ?? 0, s.money)} latest
            </span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** A goal, as a labelled bar. */
export function GoalBar({
  label,
  current,
  target,
  money,
}: {
  label: string;
  current: number;
  target: number;
  money?: boolean;
}) {
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const show = (v: number) =>
    money ? formatMoney(v) : v.toLocaleString("en-IE");

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[0.875rem] font-medium">{label}</p>
        <p className="text-[0.875rem] text-[var(--color-ink-2)]">
          <span className="font-semibold text-[var(--color-ink)]">
            {show(current)}
          </span>{" "}
          / {show(target)}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          <div
            className={`h-full rounded-full ${
              percent >= 100
                ? "bg-[var(--color-accent)]"
                : "bg-[var(--color-brand)]"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-[0.8125rem] font-semibold tabular-nums text-[var(--color-ink-2)]">
          {percent}%
        </span>
      </div>
    </div>
  );
}
