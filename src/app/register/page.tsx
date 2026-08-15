import { AuthForm } from "@/components/auth-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        eyebrow="Join BizHub"
        title="Create your account"
        description="Free to join. Save listings, message sellers, make offers and list your own business."
      />
      <div className="shell py-12">
        <div className="mx-auto max-w-md">
          <AuthForm mode="register" />
        </div>
      </div>
    </>
  );
}
