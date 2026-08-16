-- Descriptions for the main tables.
--
-- These show up in the Supabase table editor and in `\d+` on the command line,
-- so anyone opening the database later can tell what each table holds without
-- reading the application. Comments are idempotent: re-running this replaces
-- the text rather than failing.

comment on table public.profiles is
  'One row per member, created automatically on sign-up. Publicly readable — email addresses and phone numbers stay in auth.users and are never copied here.';

comment on table public.listings is
  'Everything for sale across all nine marketplaces. Kind-specific fields live in the attributes JSONB column so a new marketplace needs no migration.';

comment on table public.offers is
  'Offers and counter-offers. A counter chains to its parent via parent_offer_id, so the full negotiation history is preserved rather than overwritten.';

comment on table public.conversations is
  'A message thread. listing_id is null for a direct member-to-member conversation.';

comment on table public.messages is
  'Messages within a conversation. Readable only by the two participants, enforced by a SECURITY DEFINER membership check.';

comment on table public.transactions is
  'Recorded deals and the commission split. The MVP moves no money — provider is "mock" — but the fee split is stored per transaction so payouts are later a provider integration, not a schema change.';

comment on table public.verification_requests is
  'Evidence a member submitted for a Verified badge. Verification confirms supplied details only; it is never a judgement of quality or a recommendation.';

comment on table public.business_profiles is
  'A business someone runs on the platform, as opposed to one they are selling.';

comment on table public.business_products is
  'The storefront: items a business actually sells, with prices and stock. Drafts are visible only to the owner.';

comment on table public.business_milestones is
  'The build plan — a private checklist. The AI planner can seed it, but the owner owns and edits the rows afterwards.';

comment on table public.business_goals is
  'Targets the owner sets and updates by hand. Money goals are stored in cents.';

comment on table public.business_metrics is
  'Self-reported monthly figures behind the business dashboard. Not connected to any bank or accounting system, and not audited.';

comment on table public.watchlist is
  'Listings a member is tracking. price_when_added_cents is what makes a later price drop detectable.';

comment on table public.opportunity_alerts is
  'Standing searches. Checked when a listing is approved; notified_listing_ids stops the same listing alerting twice.';

comment on table public.reviews is
  'Feedback attached to a completed transaction — one per deal per side. The transaction link is the main defence against invented reviews.';

comment on table public.founder_profiles is
  'Co-founder profiles. The seeking column drives matching: it is matched against other members skills, so complementary pairs rank above similar ones.';

comment on table public.follows is
  'Who follows which member or business, for the network feed.';

comment on table public.posts is
  'The professional feed: updates, milestones and opportunities posted by members.';

comment on table public.reports is
  'Complaints about a listing, member or message, for moderators to act on.';

comment on table public.notifications is
  'In-app notifications. Written by the server on offers, messages, moderation decisions, alert matches and price drops.';
