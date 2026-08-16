"use client";

import { useState } from "react";
import { Field, Notice } from "./ui";
import { formatMoney } from "@/lib/money";

/**
 * Business calculators.
 *
 * Everything is arithmetic on numbers the member types — no data is read from
 * their business and nothing is stored. Each one states what it assumes,
 * because the assumption is usually where these calculations go wrong.
 */

const num = (raw: string): number => {
  const clean = raw.replace(/[\s,€%]/g, "");
  const value = parseFloat(clean);
  return Number.isFinite(value) ? value : 0;
};

const cents = (raw: string): number => Math.round(num(raw) * 100);

function Result({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] p-5">
      <p className="eyebrow">{label}</p>
      <p
        className={`display mt-1.5 text-2xl ${
          tone === "good"
            ? "text-[var(--color-accent)]"
            : tone === "bad"
              ? "text-[var(--color-danger)]"
              : ""
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- profit */

export function ProfitCalculator() {
  const [revenue, setRevenue] = useState("");
  const [expenses, setExpenses] = useState("");

  const r = cents(revenue);
  const e = cents(expenses);
  const profit = r - e;
  const margin = r > 0 ? (profit / r) * 100 : 0;

  return (
    <section className="card space-y-5 p-6 lg:p-8">
      <div>
        <h2 className="display text-xl">Profit</h2>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
          Revenue minus expenses, for one period. Use the same period for both.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Revenue (€)" htmlFor="pc-rev">
          <input
            id="pc-rev"
            className="input"
            inputMode="decimal"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            placeholder="10000"
          />
        </Field>
        <Field label="Expenses (€)" htmlFor="pc-exp">
          <input
            id="pc-exp"
            className="input"
            inputMode="decimal"
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
            placeholder="6500"
          />
        </Field>
      </div>

      {r > 0 || e > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Result
            label="Profit"
            value={formatMoney(profit)}
            tone={profit > 0 ? "good" : profit < 0 ? "bad" : "neutral"}
          />
          <Result
            label="Margin"
            value={`${margin.toFixed(1)}%`}
            hint="Profit as a share of revenue."
          />
        </div>
      ) : null}

      <p className="text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
        This is gross arithmetic. It does not account for tax, depreciation,
        loan repayments, or money you draw from the business yourself.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------ break-even */

export function BreakEvenCalculator() {
  const [fixed, setFixed] = useState("");
  const [price, setPrice] = useState("");
  const [variable, setVariable] = useState("");

  const f = num(fixed);
  const p = num(price);
  const v = num(variable);
  const contribution = p - v;
  const units = contribution > 0 ? Math.ceil(f / contribution) : null;

  return (
    <section className="card space-y-5 p-6 lg:p-8">
      <div>
        <h2 className="display text-xl">Break-even</h2>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
          How many sales a month it takes before the business stops losing
          money.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fixed costs / month (€)" htmlFor="be-fixed">
          <input
            id="be-fixed"
            className="input"
            inputMode="decimal"
            value={fixed}
            onChange={(e) => setFixed(e.target.value)}
            placeholder="3000"
          />
        </Field>
        <Field label="Price per unit (€)" htmlFor="be-price">
          <input
            id="be-price"
            className="input"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="49"
          />
        </Field>
        <Field label="Cost per unit (€)" htmlFor="be-var">
          <input
            id="be-var"
            className="input"
            inputMode="decimal"
            value={variable}
            onChange={(e) => setVariable(e.target.value)}
            placeholder="12"
          />
        </Field>
      </div>

      {f > 0 && p > 0 ? (
        units === null ? (
          <Notice tone="gold" title="It never breaks even">
            Each unit costs at least as much as it sells for, so selling more
            loses more. The price or the unit cost has to change first.
          </Notice>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Result
              label="Sales a month to break even"
              value={units.toLocaleString("en-IE")}
              hint={`Each sale contributes ${formatMoney(Math.round(contribution * 100))} towards fixed costs.`}
            />
            <Result
              label="Revenue at break-even"
              value={formatMoney(Math.round(units * p * 100))}
            />
          </div>
        )
      ) : null}

      <p className="text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
        Assumes one product at one price, costs that stay flat as you grow, and
        customers who pay immediately. Real businesses rarely satisfy all three.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------- ROI */

export function RoiCalculator() {
  const [invested, setInvested] = useState("");
  const [returned, setReturned] = useState("");
  const [months, setMonths] = useState("");

  const i = num(invested);
  const r = num(returned);
  const m = num(months);
  const gain = r - i;
  const roi = i > 0 ? (gain / i) * 100 : 0;
  const annualised = i > 0 && m > 0 ? (Math.pow(r / i, 12 / m) - 1) * 100 : null;

  return (
    <section className="card space-y-5 p-6 lg:p-8">
      <div>
        <h2 className="display text-xl">Return on investment</h2>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
          What you put in against what came back.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Amount invested (€)" htmlFor="roi-in">
          <input
            id="roi-in"
            className="input"
            inputMode="decimal"
            value={invested}
            onChange={(e) => setInvested(e.target.value)}
            placeholder="20000"
          />
        </Field>
        <Field label="Total returned (€)" htmlFor="roi-out">
          <input
            id="roi-out"
            className="input"
            inputMode="decimal"
            value={returned}
            onChange={(e) => setReturned(e.target.value)}
            placeholder="32000"
          />
        </Field>
        <Field label="Over how many months" htmlFor="roi-m">
          <input
            id="roi-m"
            className="input"
            inputMode="numeric"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            placeholder="24"
          />
        </Field>
      </div>

      {i > 0 && r > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Result
            label="Gain"
            value={formatMoney(Math.round(gain * 100))}
            tone={gain > 0 ? "good" : gain < 0 ? "bad" : "neutral"}
          />
          <Result label="ROI" value={`${roi.toFixed(1)}%`} />
          {annualised !== null && r > 0 ? (
            <Result
              label="Annualised"
              value={`${annualised.toFixed(1)}%`}
              hint="What that return works out to per year."
            />
          ) : null}
        </div>
      ) : null}

      <p className="text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
        Ignores tax, inflation, and the value of your own unpaid time — which
        for most small businesses is the largest cost of all.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------- valuation */

const MULTIPLES: Record<string, { low: number; high: number; note: string }> = {
  saas: { low: 2.5, high: 4.5, note: "recurring revenue, low churn" },
  ecommerce: { low: 2, high: 3.5, note: "inventory and fulfilment included" },
  content: { low: 2, high: 3.5, note: "traffic-dependent" },
  agency: { low: 1, high: 2.5, note: "people-dependent, harder to transfer" },
  local: { low: 1.5, high: 3, note: "premises, staff and local goodwill" },
};

export function ValuationHelper() {
  const [profit, setProfit] = useState("");
  const [type, setType] = useState("saas");
  const [growth, setGrowth] = useState("");

  const p = num(profit);
  const g = num(growth);
  const band = MULTIPLES[type];

  // Growth shifts the range, but only within the band — it does not invent a
  // valuation the market would not support.
  const shift = Math.max(-0.5, Math.min(0.75, g / 100));
  const low = Math.max(0.5, band.low + shift);
  const high = Math.max(low + 0.5, band.high + shift);

  return (
    <section className="card space-y-5 p-6 lg:p-8">
      <div>
        <h2 className="display text-xl">Valuation helper</h2>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
          A rough range based on annual profit and a multiple typical for the
          type of business.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Annual profit (€)" htmlFor="v-profit">
          <input
            id="v-profit"
            className="input"
            inputMode="decimal"
            value={profit}
            onChange={(e) => setProfit(e.target.value)}
            placeholder="60000"
          />
        </Field>
        <Field label="Type of business" htmlFor="v-type">
          <select
            id="v-type"
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="saas">SaaS</option>
            <option value="ecommerce">E-commerce</option>
            <option value="content">Content / media</option>
            <option value="agency">Agency / services</option>
            <option value="local">Local business</option>
          </select>
        </Field>
        <Field label="Yearly growth (%)" htmlFor="v-growth">
          <input
            id="v-growth"
            className="input"
            inputMode="decimal"
            value={growth}
            onChange={(e) => setGrowth(e.target.value)}
            placeholder="20"
          />
        </Field>
      </div>

      {p > 0 ? (
        <>
          <Result
            label="Indicative range"
            value={`${formatMoney(Math.round(p * low * 100))} – ${formatMoney(Math.round(p * high * 100))}`}
            hint={`${low.toFixed(1)}× to ${high.toFixed(1)}× annual profit — ${band.note}.`}
          />
          <Notice tone="gold" title="This is not a valuation">
            It is a multiple applied to a number you typed. A real valuation
            depends on customer concentration, churn, how much of the business
            is you personally, contracts, liabilities, and what a buyer will
            actually pay on the day. Businesses regularly sell far outside this
            range in both directions. Take professional advice before you price
            anything.
          </Notice>
        </>
      ) : null}
    </section>
  );
}
