"use client";

import { Search, Clock, TrendingUp } from "lucide-react";

export function SearchView() {
  return (
    <div>
      <h1 className="text-foreground mb-4 text-base font-semibold">Search</h1>
      <div className="mb-6">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search for furniture, rooms, styles..."
            className="border-border bg-background focus:ring-primary/20 w-full rounded-lg border py-3 pr-4 pl-10 text-sm transition-all duration-200 focus:ring-2 focus:outline-none"
          />
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <h3 className="text-foreground mb-3 flex items-center gap-2 text-sm font-medium">
            <Clock className="text-muted-foreground h-4 w-4" />
            Recent Searches
          </h3>
          <div className="space-y-2">
            {[
              "Modern living room sofa",
              "Scandinavian dining table",
              "Minimalist bedroom set",
              "Industrial office desk",
            ].map((search, index) => (
              <button
                key={index}
                type="button"
                className="bg-muted/30 hover:bg-muted/50 text-foreground w-full cursor-pointer rounded-lg px-4 py-2.5 text-left text-sm transition-all duration-200"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-foreground mb-3 flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="text-muted-foreground h-4 w-4" />
            Trending Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              "Mid-century modern",
              "Velvet sofa",
              "Accent chairs",
              "Console table",
              "Area rugs",
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
