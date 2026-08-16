import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/auth-flow";
import { Notice, PageHeader } from "@/components/ui";
import { hasExplicitSession } from "@/lib/data";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await hasExplicitSession()) redirect("/dashboard");

  return (
    <>
      <PageHeader
        eyebrow="Welcome back"
        title="Sign in to BizHub"
        description="With the email address or phone number you registered. Your saved listings, offers and conversations are waiting."
      />

      <div className="shell py-12">
        <div className="mx-auto max-w-md space-y-5">
          <AuthFlow mode="login" />

          <Notice tone="neutral">
            Signing in from a new device asks for a 6-digit code if your account
            was never confirmed. BizHub never asks for your password or a code
            by message — anyone who does is not us.
          </Notice>

          <p className="text-center text-[0.8125rem] text-[var(--color-ink-3)]">
            <Link href="/" className="hover:text-[var(--color-ink)]">
              ← Back to the marketplace
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
