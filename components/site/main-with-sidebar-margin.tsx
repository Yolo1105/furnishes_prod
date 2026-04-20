"use client";

import { cn } from "@/lib/utils";
import { useRightNav } from "@/components/site/right-nav-context";

export function MainWithSidebarMargin({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarOpen } = useRightNav();

  return (
    <main
      id="main"
      className={cn(
        "relative flex min-h-0 flex-1 flex-col transition-[margin] duration-500 ease-in-out",
        isSidebarOpen ? "md:mr-[400px]" : "mr-0",
      )}
    >
      {children}
    </main>
  );
}
