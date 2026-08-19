import Link from "next/link";
import { Notice } from "@/components/ui";

const PAGES = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/marketplace-rules", label: "Marketplace Rules" },
  { href: "/legal/verification", label: "About Verification" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="shell py-12 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Legal pages" className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow mb-3.5">Legal</p>
          <ul className="space-y-1">
            {PAGES.map((page) => (
              <li key={page.href}>
                <Link
                  href={page.href}
                  className="block rounded-lg px-3 py-2 text-[0.875rem] text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl">
          <div className="mb-8">
            <Notice tone="gold" title="Placeholder document">
              This page is a plain-language placeholder written for the MVP. It
              has not been drafted or reviewed by a qualified legal
              professional, and it is not legal advice. Before Buildora operates
              commercially, every page in this section must be reviewed and
              replaced by a lawyer qualified in each market the platform serves.
            </Notice>
          </div>
          <article className="legal-body">{children}</article>
        </div>
      </div>
    </div>
  );
}
