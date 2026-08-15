# BizHub

**Buy a Business. Build a Business. Sell a Business.**

An international marketplace where people buy and sell whole businesses, trade
and license patents and technologies, acquire digital assets, hire specialists,
find partners — and start a business from nothing but a sentence.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4 and Supabase.

---

## Open it in a browser

Three ways, fastest first. All of them run the app in **demo mode** — seeded
data, an account already signed in, no configuration needed.

### Deploy a public URL — one click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEgipet2026%2FBuildora%2Ftree%2Fclaude%2Fbizhub-marketplace-mvp-0jqrze&project-name=bizhub&repository-name=bizhub)

Sign in to Vercel with GitHub, press Deploy, and in a few minutes you have a
permanent address like `bizhub-xxx.vercel.app` that anyone can open. No
environment variables required.

### Run it in the browser — no installation

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Egipet2026/Buildora?ref=claude/bizhub-marketplace-mvp-0jqrze)

Codespaces builds the container, installs dependencies and starts the dev
server on its own — the preview opens when port 3000 comes up.

### Run it locally

Requires Node.js 20 or newer.

```bash
git clone -b claude/bizhub-marketplace-mvp-0jqrze https://github.com/Egipet2026/Buildora.git
cd Buildora
npm install
npm run dev          # http://localhost:3000
```

With no environment variables the app runs in **demo mode**: a seeded dataset
of businesses, patents, services, partners, offers, conversations and
moderation queues, with a demo account already signed in.
Every authenticated surface — buyer dashboard, seller dashboard, admin,
messaging, negotiations — is browsable immediately, and writes are applied to an
in-memory store so the flows behave like the real thing. A restart resets the
data.

### Connecting a real database

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` against it (`supabase db push`, or
   paste it into the SQL editor). It creates the schema, the row-level security
   policies, the storage buckets and the sign-up trigger.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=…
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   ```

4. Restart. Authentication, the database, storage and realtime messaging
   activate automatically — no code changes.

Optionally set `ANTHROPIC_API_KEY` to enable the live business-plan generator on
`/start-a-business`. Without it the planner falls back to a deterministic
template.

---

## What's in the MVP

| Area | Status |
| --- | --- |
| Landing page, nine marketplaces, category browse | ✅ |
| Registration / login (Supabase Auth), session refresh | ✅ |
| Business marketplace with financial filters and five sort orders | ✅ |
| Patent & technology marketplace, purchase / exclusive / non-exclusive licence | ✅ |
| Digital assets, services, partners, ideas, products, AI tools, marketing | ✅ |
| Business profiles (“looking for partners / developers / suppliers…”) | ✅ |
| Listing creation with moderation queue | ✅ |
| Listing detail: financials, rights, documents, seller, similar listings | ✅ |
| Plain-language search (“a SaaS business under €20,000”) + structured filters | ✅ |
| Offers, counter-offers, accept / decline, full negotiation history | ✅ |
| Messaging with unread counts, realtime updates, report user | ✅ |
| Favourites | ✅ |
| Buyer dashboard: saved, offers, purchases, notifications | ✅ |
| Seller dashboard: listings, offers, analytics, promotions, verification | ✅ |
| Admin: moderation, members, reports, verification, transactions, pricing | ✅ |
| Verification workflow (seller / business / patent) | ✅ |
| Featured & Boost placement | ✅ |
| 10% commission calculation, shown before every transaction | ✅ |
| Mock checkout — records the deal and the split, moves no money | ✅ |

### Deliberately not built

**Investment opportunities** appear on the home page as a planned category and
are not clickable. Offering or brokering investments is a regulated activity in
most jurisdictions, so the surface stays disabled until the platform is licensed
to operate it. The “looking for” options on a business profile exclude investors
for the same reason.

**Real payments.** The platform records transactions and the commission split so
both sides see identical numbers, but takes no payment and holds no funds.
Holding money on behalf of others is regulated. The data model already carries
the fee split per transaction, so enabling payouts later is a payment-provider
integration rather than a schema change.

---

## Architecture

```
src/
  app/                     Routes (App Router)
    (marketplaces)         /businesses /patents /digital-assets /services …
    listing/[id]           Listing detail
    dashboard/             Buyer dashboard
    seller/                Seller dashboard
    admin/                 Administration
    messages/              Conversations
    legal/                 Placeholder legal documents
  components/              UI, listing cards, filters, dialogs, forms
  lib/
    types.ts               Domain types, mirroring the SQL schema 1:1
    taxonomy.ts            The nine marketplaces and their categories
    money.ts               Commission maths and currency formatting
    filters.ts             Filtering, sorting, plain-language query parsing
    data.ts                Read layer (Supabase or demo store)
    actions.ts             Write layer — server actions
    validation.ts          Zod schemas for every form
    ai/plan.ts             Business-plan generation
    demo/                  Seed dataset and in-memory store
    supabase/              Browser, server and middleware clients
supabase/migrations/       Schema, RLS policies, storage buckets
```

### The data layer

`data.ts` and `actions.ts` are the only modules that know whether Supabase is
configured. Each function resolves against Postgres when credentials exist and
against the in-memory demo store otherwise. Filtering and sorting run in
TypeScript on both paths, so search semantics can never drift between demo and
production; the Supabase path still pushes the status and owner predicates down
to the database.

### Money

All amounts are integer cents. `calculateFees` rounds to the platform's fee so
`fee + net` always reconstructs the total exactly — no stray cent can appear in
a payout. The commission rate is stored in basis points and is editable from the
admin dashboard.

### Security

- Row-level security on every table, deny by default.
- Sellers cannot self-publish, self-verify or self-feature — the insert policy
  restricts new listings to `draft`/`pending` with the verification and featured
  flags off.
- Offers are readable only by their two parties; messages only by conversation
  participants, enforced by a `SECURITY DEFINER` membership function.
- Email addresses are never exposed through the profiles table.
- Listing documents live in a private storage bucket and are released on the
  seller's terms, not via public URLs.
- Every admin server action re-checks the caller's role; the UI check is only
  about what gets rendered.
- All form input is validated with Zod on the server, regardless of client-side
  constraints.

---

## Legal position

BizHub is a venue. It does not guarantee that a business is profitable, that a
patent is valid or valuable, that a transaction will succeed, or that a seller
is reliable. Verification confirms information a member has supplied, to the
extent the platform can lawfully check it — it is never an endorsement.

The documents under `/legal` are plain-language placeholders written for this
MVP. **They must be reviewed and replaced by a qualified legal professional for
each market the platform serves before it operates commercially.**

---

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```
