# Bizora

**Buy a Business. Build a Business. Sell a Business.**

An international marketplace where people buy and sell whole businesses, trade
and license patents and technologies, acquire digital assets, hire specialists,
find partners — and start a business from nothing but a sentence.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4 and Supabase.

---

## Open it in a browser

Three ways, fastest first. None of them need any configuration: the Supabase
project the app talks to is committed in `src/lib/supabase/project.ts`, so a
deploy is connected to a real database from the first build.

### Deploy a public URL — one click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEgipet2026%2FBuildora&project-name=bizora&repository-name=bizora)

Sign in to Vercel with GitHub, press Deploy, and in a few minutes you have a
permanent address like `bizora-xxx.vercel.app` that anyone can open. No
environment variables required.

### Run it in the browser — no installation

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Egipet2026/Buildora)

Codespaces builds the container, installs dependencies and starts the dev
server on its own — the preview opens when port 3000 comes up.

### Other one-click hosts

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Egipet2026/Buildora)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Egipet2026/Buildora)

### Other hosts

The app is a Next.js server — it needs a Node runtime, not a static file host.
Anything in this table works; the repository already carries the configuration
each one looks for.

| Host | Free tier | Config in repo | Notes |
| --- | --- | --- | --- |
| **Netlify** | Yes | `netlify.toml` | Closest equivalent to Vercel. Server actions and middleware run on the official Next.js plugin. |
| **Render** | Yes | `render.yaml` | Blueprint deploy, no manual setup. Free instances sleep when idle and take ~30s to wake. |
| **Railway** | Trial credit | `Dockerfile` | Detects the Dockerfile automatically. |
| **Fly.io** | Yes | `Dockerfile` | `fly launch` reads it. Card required even on the free allowance. |
| **Koyeb / Northflank** | Yes | `Dockerfile` | Both deploy a container straight from GitHub. |
| **Google Cloud Run** | Generous | `Dockerfile` | Scales to zero; pay per request. |
| **Any VPS** | — | `Dockerfile` | `docker build -t bizora . && docker run -p 3000:3000 bizora`. Also works with Coolify or Dokploy. |

**GitHub Pages will not work.** It serves static files only, and this app uses
server actions and middleware for offers, messaging and moderation.

### Run it locally

Requires Node.js 20 or newer.

```bash
git clone https://github.com/Egipet2026/Buildora.git
cd Buildora
npm install
npm run dev          # http://localhost:3000
```

Out of the box this connects to the Supabase project committed in
`src/lib/supabase/project.ts` — the same one the deployed site uses. Set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
`.env.local` to point at your own project instead; the environment always wins
over the committed values.

**Demo mode** — a seeded dataset of businesses, patents, services, partners,
offers and conversations held in memory, with every authenticated surface
browsable immediately — is what runs when there is no project at all. Empty
both values in `project.ts` to get it back.

### Why the project credentials are in the repository

The URL and the publishable key are public by design: the key is sent to every
visitor's browser on every page load, and Supabase's dashboard says in as many
words that publishable keys can be shared publicly. What protects the data is
row-level security, which the migrations enable on every table.

Committing them means deploying needs no dashboard configuration, which is the
single step that most often goes wrong. The **secret key** (`sb_secret_…`) is a
different thing entirely — it bypasses row-level security and must never be
committed anywhere.

### Connecting a real database

1. Create a Supabase project.
2. Open **SQL Editor** in the project, paste the whole of
   [`supabase/setup.sql`](supabase/setup.sql) and press Run. That one file is
   every migration joined in order — schema, row-level security, storage
   buckets and the sign-up trigger. (The individual files in
   `supabase/migrations/` are still there for `supabase db push`, and are what
   you need when upgrading a project that already has Bizora tables.)
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=…
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   ```

4. Restart. Authentication, the database, storage and realtime messaging
   activate automatically — no code changes.

**Running the migrations without copying anything.** Pasting 35 KB of SQL is
awkward on a phone. Supabase can run the migrations itself instead: in the
project, **Project Settings → Integrations → GitHub**, connect this repository,
leave **Working directory** empty (the `supabase/` folder is at the repository
root), turn on **Deploy to production**, set the branch to `main`, and press
**Save changes**. Two things catch people out: the settings do nothing until
Save is pressed, and the integration only reacts to pushes made *after* that —
so push a commit afterwards to trigger the first run.

### Sending the confirmation code

Sign-up and sign-in take an email address *or* a phone number plus a password,
then a six-digit code. **That code has to be sent by somebody** — an email API,
an SMTP server or an SMS gateway — and that needs an account. Set one of these
and the code is delivered for real, with no code changes:

| Channel | Variables | Notes |
| --- | --- | --- |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` | Simplest. Free tier covers development. The From domain must be verified in Resend. |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Any SMTP server — Gmail, Fastmail, Postmark, your own. |
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM` *or* `TWILIO_MESSAGING_SERVICE_SID` | Required for phone sign-up. |

**With none of them set the code cannot be sent at all**, so it is shown on
screen and labelled as undelivered. That is the only situation in which the
code is ever displayed: once a provider is configured, a delivery failure tells
the member to request a new code rather than revealing it.

If you use Supabase for auth, Supabase sends the email code itself, and phone
sign-up needs an SMS provider configured under Authentication → Providers →
Phone.

### The AI features

Set `ANTHROPIC_API_KEY` to enable them. Three surfaces use it:

| Surface | Without a key |
| --- | --- |
| `/start-a-business` — business plan, name, competitors, risks | Falls back to a deterministic template |
| `/market-research` — indicative market overview | Falls back to a research *method*, not a fabricated overview |
| “Improve with AI” on a listing | Unavailable — the seller writes it themselves |

All three are labelled as indicative wherever they appear. The listing
assistant is constrained to rewrite only what the seller supplied: it must not
add revenue figures, customer counts or claims of any kind, because that text
is published under a real person's name and they are responsible for it.

---

## What's in the MVP

| Area | Status |
| --- | --- |
| Landing page, nine marketplaces, category browse | ✅ |
| Registration / login by email **or phone** + password, 6-digit code | ✅ |
| Business marketplace with financial filters and five sort orders | ✅ |
| Patent & technology marketplace, purchase / exclusive / non-exclusive licence | ✅ |
| Digital assets, services, partners, ideas, products, AI tools, marketing | ✅ |
| Business profiles (“looking for partners / developers / suppliers…”) | ✅ |
| Business workspace: a real storefront with priced products, stock and drafts | ✅ |
| Build plan — an editable checklist the AI planner can seed but does not own | ✅ |
| Member directory and public member pages | ✅ |
| Listing creation with moderation queue | ✅ |
| Listing detail: financials, rights, documents, seller, similar listings | ✅ |
| Plain-language search (“a SaaS business under €20,000”) + structured filters | ✅ |
| Offers, counter-offers, accept / decline, full negotiation history | ✅ |
| Messaging: listing threads **and** direct member-to-member, live updates | ✅ |
| Favourites | ✅ |
| Buyer dashboard: saved, offers, purchases, notifications | ✅ |
| Seller dashboard: listings, offers, analytics, promotions, verification | ✅ |
| Admin: moderation, members, reports, verification, transactions, pricing | ✅ |
| Verification workflow (seller / business / patent) | ✅ |
| Featured & Boost placement | ✅ |
| 10% commission calculation, shown before every transaction | ✅ |
| Mock checkout — records the deal and the split, moves no money | ✅ |
| **BizMatch** — ranked matches with the reasoning shown for every score | ✅ |
| **Opportunities** — one feed of everything newly listed, with type filters | ✅ |
| **Watchlist** with price history, and price-drop notifications | ✅ |
| **Opportunity alerts** — standing searches that fire the moment a listing is approved | ✅ |
| **Reviews & ratings** — one per completed deal, both directions | ✅ |
| **Bizora Trust Score** — verification, deals, reviews, age, upheld reports | ✅ |
| **Find a co-founder** — matched on complementary skills, not similar ones | ✅ |
| **Network** — follow founders, post updates, milestones and opportunities | ✅ |
| **Business calculators** — profit, break-even, ROI, indicative valuation | ✅ |
| **Goals** with progress bars, and a monthly business dashboard with charts | ✅ |
| **Starter checklists** by business type, feeding the build plan | ✅ |
| **Market research** — indicative overview of a market, clearly labelled | ✅ |
| **AI listing assistant** — drafts a listing from your notes, adds no facts | ✅ |
| **Recommended for you** — from what you saved and watched, or nothing at all | ✅ |

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
integration rather than a schema change. Storefront products are quoted and
enquired about, not checked out — the same reason.

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
    members/               Member directory and public member pages
    workspace/             The owner's business: storefront, plan, goals, charts
    bizmatch/              Ranked matching against what you tell it
    opportunities/         One feed of everything newly listed
    co-founders/           Complementary-skill matching
    network/               Professional feed
    tools/                 Business calculators
    market-research/       Indicative market overview
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
- Email addresses and phone numbers are never exposed through the profiles
  table — they stay in `auth.users`, which only the member themselves can read.
- The sign-in form returns the same message whether the account does not exist
  or the password is wrong, so it cannot be used to discover who is a member.
- Confirmation codes come from the CSPRNG, are stored hashed, expire after ten
  minutes, die after five wrong guesses, and cannot be re-requested more than
  once a minute. Issuing a new code retires the previous one.
- The demo session cookie holds an opaque random token, not a user id, so it
  cannot be edited into someone else's identity.
- Listing documents live in a private storage bucket and are released on the
  seller's terms, not via public URLs.
- Every admin server action re-checks the caller's role; the UI check is only
  about what gets rendered.
- All form input is validated with Zod on the server, regardless of client-side
  constraints.

---

## Legal position

Bizora is a venue. It does not guarantee that a business is profitable, that a
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
