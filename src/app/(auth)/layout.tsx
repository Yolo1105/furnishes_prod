import { AuthChrome } from "@/features/auth/AuthSplit";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthChrome>{children}</AuthChrome>;
}
