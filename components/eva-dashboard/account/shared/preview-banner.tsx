import { Sparkles } from "lucide-react";

export function PreviewBanner() {
  return (
    <div
      className="mb-6 flex items-start gap-3 border px-4 py-3"
      style={{
        background: "var(--card-soft)",
        borderColor: "var(--border-strong)",
      }}
    >
      <Sparkles
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
        style={{ color: "var(--primary)" }}
      />
      <div>
        <p
          className="font-ui text-[10.5px] tracking-[0.18em] uppercase"
          style={{ color: "var(--primary)" }}
        >
          [ PREVIEW ]
        </p>
        <p
          className="font-body mt-1 text-sm"
          style={{ color: "var(--foreground)" }}
        >
          This page is in preview. Changes you make here aren&apos;t saved yet —
          we&apos;ll let you know when it&apos;s live.
        </p>
      </div>
    </div>
  );
}
