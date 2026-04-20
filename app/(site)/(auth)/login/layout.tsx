import type { Metadata } from "next";
import { SITE_TITLE } from "@/content/site/site";
import { LoginSessionProvider } from "./login-session-provider";

export const metadata: Metadata = {
  title: `Sign in | ${SITE_TITLE}`,
  description: "Access your Furnishes account.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LoginSessionProvider>{children}</LoginSessionProvider>;
}
