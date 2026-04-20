"use client";

export function CustomizeView() {
  return (
    <div>
      <h1 className="text-foreground text-base font-semibold">Customize</h1>
      <p className="text-muted-foreground mb-4 text-xs">
        Adjust your preferences and settings
      </p>
      <div className="space-y-3">
        <div className="border-border bg-card rounded border p-4">
          <h4 className="mb-2 text-xs font-medium">Measurement Units</h4>
          <div className="flex gap-2">
            {["Metric", "Imperial"].map((unit) => (
              <button
                type="button"
                key={unit}
                className="bg-secondary/50 hover:bg-accent hover:text-accent-foreground rounded px-3 py-1.5 text-xs transition-colors duration-200"
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
        <div className="border-border bg-card rounded border p-4">
          <h4 className="mb-2 text-xs font-medium">Default Budget</h4>
          <input
            type="number"
            placeholder="Set default"
            className="border-border bg-background w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
