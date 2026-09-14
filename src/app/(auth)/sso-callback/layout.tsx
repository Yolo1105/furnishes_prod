import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signing In",
};

export default function SsoCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
