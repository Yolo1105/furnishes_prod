import type { Metadata } from "next";
import { VerifyEmailClient } from "./verify-email-client";

export const metadata: Metadata = {
  title: "Verifying your email",
  description: "Confirming your email address with Furnishes.",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <VerifyEmailClient token={token} />;
}
