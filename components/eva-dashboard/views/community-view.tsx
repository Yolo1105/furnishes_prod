"use client";

export function CommunityView() {
  return (
    <div>
      <h1 className="text-foreground text-base font-semibold">Community</h1>
      <p className="text-muted-foreground mb-4 text-xs">
        Explore shared designs and templates
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-border bg-card rounded border p-3">
            <div className="bg-secondary/30 mb-2 h-32 rounded" />
            <h4 className="text-xs font-medium">Shared Design {i}</h4>
            <p className="text-muted-foreground text-[10px]">by Designer {i}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
