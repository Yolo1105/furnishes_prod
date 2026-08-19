import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignupForm } from "@/features/auth/SignupForm";
import { routes } from "@/lib/contracts/routes";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const { userId } = await auth();
      if (userId) {
        redirect(
          `/api/auth/clerk-callback?next=${encodeURIComponent(routes.account)}`,
        );
      }
    } catch {
      /* Clerk unavailable during this request; show the form. */
    }
  }
  return <SignupForm />;
}
