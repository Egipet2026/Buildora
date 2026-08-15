import { AuthForm } from "@/components/auth-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <PageHeader
        eyebrow="Welcome back"
        title="Sign in to BizHub"
        description="Your saved listings, offers, conversations and dashboards are waiting."
      />
      <div className="shell py-12">
        <div className="mx-auto max-w-md">
          <AuthForm mode="login" />
        </div>
      </div>
    </>
  );
}
