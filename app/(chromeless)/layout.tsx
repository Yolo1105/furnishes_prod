import type { ReactNode } from "react";

export default function ChromelessLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main
      id="main"
      className="relative mr-0 flex min-h-[100dvh] flex-1 flex-col"
    >
      {children}
    </main>
  );
}
