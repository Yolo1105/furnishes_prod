"use client";

export function ComingSoonView({ featureName }: { featureName: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-foreground text-sm font-medium">{featureName}</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        Feature in development — check back soon.
      </p>
    </div>
  );
}
