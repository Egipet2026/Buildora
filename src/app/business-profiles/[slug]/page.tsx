import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ListingGrid } from "@/components/listing-card";
import { Cover, KeyValue, Notice, SectionHead } from "@/components/ui";
import { MessageMemberButton } from "@/components/message-member";
import {
  getBusinessProducts,
  getBusinessProfile,
  getCurrentUser,
  getFavoriteIds,
  getListings,
  getProfile,
} from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const profile = await getBusinessProfile((await params).slug);
  if (!profile) return { title: "Profile not found" };
  return { title: profile.name, description: profile.description };
}

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getBusinessProfile(slug);
  if (!profile) notFound();

  const me = await getCurrentUser();
  const [owner, listings, savedIds, products] = await Promise.all([
    getProfile(profile.owner_id),
    getListings({ ownerId: profile.owner_id, limit: 3 }),
    me ? getFavoriteIds(me.id) : Promise.resolve([]),
    getBusinessProducts(profile.id),
  ]);
  const isOwner = me?.id === profile.owner_id;

  return (
    <div className="bg-[var(--color-canvas)]">
      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <Cover seed={profile.id} label={profile.name} className="h-40 w-full" size="lg" />
        <div className="shell py-8">
          <p className="eyebrow mb-2">{profile.industry}</p>
          <h1 className="display text-3xl lg:text-[2.5rem]">{profile.name}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-ink-2)]">
            {profile.description}
          </p>

          {profile.looking_for.length ? (
            <div className="mt-6">
              <p className="eyebrow mb-2.5">Looking for</p>
              <div className="flex flex-wrap gap-2">
                {profile.looking_for.map((item) => (
                  <span key={item} className="badge badge-brand">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            {profile.goals ? (
              <div className="card p-6 lg:p-8">
                <h2 className="display mb-3 text-xl">Business goals</h2>
                <p className="leading-relaxed text-[var(--color-ink-2)]">
                  {profile.goals}
                </p>
              </div>
            ) : null}

            {/* The storefront: real items the owner keeps up to date from
                their workspace, not a list of names. */}
            {products.length ? (
              <div id="storefront" className="card overflow-hidden">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-line)] p-6 lg:p-8">
                  <div>
                    <h2 className="display text-xl">What they sell</h2>
                    <p className="mt-1.5 text-[0.8125rem] text-[var(--color-ink-3)]">
                      {products.length} {products.length === 1 ? "item" : "items"} ·
                      prices set by the business
                    </p>
                  </div>
                  {isOwner ? (
                    <Link href="/workspace/products" className="btn btn-outline btn-sm">
                      Edit these
                    </Link>
                  ) : null}
                </div>

                <div className="divide-y divide-[var(--color-line)]">
                  {products.map((product) => (
                    <div key={product.id} className="p-6 lg:p-8">
                      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                        <h3 className="text-[1.0625rem] font-semibold">
                          {product.name}
                        </h3>
                        <p className="display shrink-0 text-lg">
                          {product.price_cents === null
                            ? "On request"
                            : formatMoney(product.price_cents, product.currency)}
                          {product.unit ? (
                            <span className="ml-1.5 text-[0.75rem] font-normal text-[var(--color-ink-3)]">
                              {product.unit}
                            </span>
                          ) : null}
                        </p>
                      </div>

                      <p className="mt-2.5 leading-relaxed text-[var(--color-ink-2)]">
                        {product.description}
                      </p>

                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        {product.status === "out_of_stock" ? (
                          <span className="badge badge-gold">Out of stock</span>
                        ) : product.stock !== null ? (
                          <span className="badge">{product.stock} in stock</span>
                        ) : (
                          <span className="badge">Made to order</span>
                        )}
                        {product.sku ? (
                          <span className="text-[0.75rem] text-[var(--color-ink-3)]">
                            {product.sku}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)] p-6 lg:p-8">
                  {me && owner && !isOwner ? (
                    <MessageMemberButton
                      memberId={owner.id}
                      memberName={profile.name}
                      label="Enquire about these"
                      className="btn btn-brand w-full"
                      placeholder={`Hello — I am interested in what ${profile.name} offers. Could you tell me more about…`}
                    />
                  ) : !me ? (
                    <Link href="/login" className="btn btn-brand w-full">
                      Sign in to enquire
                    </Link>
                  ) : null}
                  <p className="mt-3 text-center text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                    Buildora does not process payment for these items. You agree
                    terms directly with the business.
                  </p>
                </div>
              </div>
            ) : null}

            {!products.length && profile.products.length ? (
              <div className="card p-6 lg:p-8">
                <h2 className="display mb-4 text-xl">Products</h2>
                <ul className="space-y-2.5">
                  {profile.products.map((p) => (
                    <li key={p} className="flex gap-3">
                      <span className="text-[var(--color-accent)]" aria-hidden>
                        ▪
                      </span>
                      <span className="text-[0.9375rem] text-[var(--color-ink-2)]">
                        {p}
                      </span>
                    </li>
                  ))}
                </ul>
                {isOwner ? (
                  <Link href="/workspace/products" className="btn btn-outline btn-sm mt-5">
                    Turn these into a real storefront
                  </Link>
                ) : null}
              </div>
            ) : null}

            {/* The self-declared services list is the fallback for a business
                that has not built a storefront yet; once it has, the priced
                items above are the better answer to the same question. */}
            {!products.length && profile.services.length ? (
              <div className="card p-6 lg:p-8">
                <h2 className="display mb-4 text-xl">Services</h2>
                <ul className="space-y-2.5">
                  {profile.services.map((s) => (
                    <li key={s} className="flex gap-3">
                      <span className="text-[var(--color-accent)]" aria-hidden>
                        ▪
                      </span>
                      <span className="text-[0.9375rem] text-[var(--color-ink-2)]">
                        {s}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {profile.team.length ? (
              <div className="card p-6 lg:p-8">
                <h2 className="display mb-4 text-xl">Team</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {profile.team.map((member) => (
                    <div key={member.name} className="flex items-center gap-3">
                      <Cover
                        seed={member.name}
                        label={member.name}
                        size="sm"
                        className="h-10 w-10 shrink-0 rounded-full"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{member.name}</p>
                        <p className="truncate text-[0.8125rem] text-[var(--color-ink-3)]">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card px-6 py-2">
              <dl>
                <KeyValue label="Industry" value={profile.industry} />
                <KeyValue label="Country" value={profile.country} />
                <KeyValue
                  label="Website"
                  value={
                    profile.website ? (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-[var(--color-brand)] hover:underline"
                      >
                        {profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null
                  }
                />
                <KeyValue label="Published" value={formatDate(profile.created_at)} />
                <KeyValue label="Owner" value={owner?.full_name ?? null} />
              </dl>
            </div>

            <div className="card p-6">
              <p className="eyebrow mb-3">Get in touch</p>
              <p className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                Messages stay on Buildora, so both sides keep a record. Your email
                address and phone number are never shown.
              </p>
              {owner && me && !isOwner ? (
                <MessageMemberButton
                  memberId={owner.id}
                  memberName={profile.name}
                  className="btn btn-brand mt-4 w-full"
                />
              ) : !me ? (
                <Link href="/login" className="btn btn-brand mt-4 w-full">
                  Sign in to message
                </Link>
              ) : (
                <Link href="/workspace" className="btn btn-outline mt-4 w-full">
                  Open your workspace
                </Link>
              )}
              {owner ? (
                <Link
                  href={`/members/${owner.id}`}
                  className="btn btn-outline btn-sm mt-2.5 w-full"
                >
                  View owner profile
                </Link>
              ) : null}
            </div>

            <Notice tone="neutral">
              Business profiles are self-published. Buildora does not verify the
              claims in them unless the business is separately verified.
            </Notice>
          </aside>
        </div>

        {listings.length ? (
          <div className="mt-16">
            <SectionHead title={`Listings from ${profile.name}`} />
            <ListingGrid
              listings={listings}
              savedIds={savedIds}
              redirectTo={`/business-profiles/${profile.slug}`}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
