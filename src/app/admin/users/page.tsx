import { ModerateUser } from "@/components/admin-actions";
import { getCurrentUser, getListings, getProfiles } from "@/lib/data";
import { formatDate } from "@/lib/money";

export const metadata = { title: "Members" };

export default async function AdminUsersPage() {
  const [me, profiles, listings] = await Promise.all([
    getCurrentUser(),
    getProfiles(),
    getListings({
      statuses: ["draft", "pending", "active", "rejected", "sold", "archived"],
    }),
  ]);

  const counts = new Map<string, number>();
  for (const l of listings) {
    counts.set(l.owner_id, (counts.get(l.owner_id) ?? 0) + 1);
  }

  return (
    <div className="card table-wrap">
      <table className="data-table !min-w-[860px]">
        <thead>
          <tr>
            <th>Member</th>
            <th>Country</th>
            <th>Plan</th>
            <th>Listings</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id}>
              <td>
                <p className="font-medium text-[var(--color-ink)]">
                  {p.full_name}
                  {p.role === "admin" ? (
                    <span className="badge badge-brand ml-1.5">Admin</span>
                  ) : null}
                </p>
                {p.headline ? (
                  <p className="mt-0.5 max-w-64 truncate text-[0.75rem] text-[var(--color-ink-3)]">
                    {p.headline}
                  </p>
                ) : null}
              </td>
              <td>{p.country ?? "—"}</td>
              <td className="capitalize">{p.premium_tier}</td>
              <td>{counts.get(p.id) ?? 0}</td>
              <td className="whitespace-nowrap">{formatDate(p.created_at)}</td>
              <td>
                <div className="flex flex-col gap-1">
                  {p.is_verified ? (
                    <span className="badge badge-verified self-start">
                      Verified
                    </span>
                  ) : (
                    <span className="badge badge-neutral self-start capitalize">
                      {p.verification_status}
                    </span>
                  )}
                  {p.is_blocked ? (
                    <span className="badge badge-danger self-start">Blocked</span>
                  ) : null}
                </div>
              </td>
              <td>
                <ModerateUser
                  userId={p.id}
                  isBlocked={p.is_blocked}
                  isVerified={p.is_verified}
                  isSelf={p.id === me?.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
