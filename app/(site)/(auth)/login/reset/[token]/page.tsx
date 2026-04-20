import type { Metadata } from "next";
import { ResetPasswordClient } from "./reset-password-client";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Furnishes account.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ResetPasswordClient token={token} />;
}
