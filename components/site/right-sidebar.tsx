"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRightNav } from "@/components/site/right-nav-context";
import { LOGIN_HREF } from "@/content/site/site";

export function RightSidebar() {
  const { isSidebarOpen, activeSection } = useRightNav();

  return (
    <div
      className={cn(
        "border-foreground/10 bg-background/95 fixed top-0 right-0 z-40 h-screen w-full max-w-[400px] border-l backdrop-blur-md transition-transform duration-500 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "translate-x-full",
      )}
      aria-hidden={!isSidebarOpen}
    >
      <div
        className="flex h-full flex-col px-6 pb-8 md:px-8"
        style={{ paddingTop: "var(--site-fixed-underlay-top)" }}
      >
        <div className="flex-1">
          <h2 className="font-nav text-foreground mb-6 text-2xl font-light tracking-wide capitalize">
            {activeSection || "Menu"}
          </h2>

          <div className="space-y-4 text-sm">
            {activeSection === "cart" && (
              <div className="text-foreground/75">
                <p className="mb-4">Your cart is empty.</p>
                <p className="text-foreground/60 text-xs">
                  Add pieces from Collections to get started.
                </p>
              </div>
            )}

            {activeSection === "wishlist" && (
              <div className="text-foreground/75">
                <p className="mb-4">No saved items yet.</p>
                <p className="text-foreground/60 text-xs">
                  Save favorites as you browse Inspiration.
                </p>
              </div>
            )}

            {activeSection === "search" && (
              <div>
                <label htmlFor="right-nav-search" className="sr-only">
                  Search
                </label>
                <input
                  id="right-nav-search"
                  type="search"
                  placeholder="Search collections…"
                  className="border-foreground/20 text-foreground placeholder:text-foreground/45 focus:border-accent w-full border bg-transparent px-4 py-3 transition-colors focus:outline-none"
                  autoFocus={isSidebarOpen && activeSection === "search"}
                />
                <p className="text-foreground/60 mt-4 text-xs">
                  Start typing to filter products and stories.
                </p>
              </div>
            )}

            {activeSection === "profile" && (
              <div className="space-y-3">
                <Link
                  href={LOGIN_HREF}
                  className="text-foreground hover:text-accent block w-full py-2 transition-colors"
                >
                  Sign in
                </Link>
                <p className="text-foreground/60 text-xs">
                  Sign in to access your saved work and account tools when they
                  are linked to your profile.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
