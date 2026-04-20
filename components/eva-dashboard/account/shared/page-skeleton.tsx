/**
 * PageSkeleton — reusable in-page loading state for `loading.tsx` / Suspense.
 */

export type PageSkeletonProps = {
  eyebrow?: string;
  subtitle?: boolean;
  cards?: number;
  columns?: 1 | 2 | 3;
  variant?: "default" | "minimal";
  children?: React.ReactNode;
};

export function PageSkeleton({
  eyebrow = "LOADING",
  subtitle = true,
  cards = 4,
  columns = 2,
  variant,
  children,
}: PageSkeletonProps) {
  const showCards = variant !== "minimal" && cards > 0 && !children;
  const gridCols =
    columns === 3
      ? "repeat(3, minmax(0, 1fr))"
      : columns === 1
        ? "1fr"
        : "repeat(2, minmax(0, 1fr))";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${eyebrow.toLowerCase()} — loading`}
      className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10"
    >
      <p
        style={{
          fontWeight: 500,
          fontSize: "10.5px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--muted-foreground)",
          marginBottom: "12px",
        }}
      >
        <span style={{ color: "var(--primary)" }}>[</span>
        <span style={{ margin: "0 6px" }}>{eyebrow}</span>
        <span style={{ color: "var(--primary)" }}>]</span>
      </p>

      <SkeletonBar
        height={32}
        widthPercent={50}
        marginBottomPx={subtitle ? 12 : 32}
        contrast="strong"
      />

      {subtitle && (
        <SkeletonBar
          height={14}
          widthPercent={60}
          marginBottomPx={32}
          contrast="soft"
          delay={0.15}
        />
      )}

      {children ? (
        <div>{children}</div>
      ) : showCards ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            gap: "16px",
          }}
        >
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} delay={0.05 * i} />
          ))}
        </div>
      ) : null}

      <style>{`
        @keyframes furnishes-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0;  }
        }
      `}</style>
    </div>
  );
}

function SkeletonBar({
  height,
  widthPercent,
  marginBottomPx = 0,
  contrast = "strong",
  delay = 0,
}: {
  height: number;
  widthPercent: number;
  marginBottomPx?: number;
  contrast?: "strong" | "soft";
  delay?: number;
}) {
  const gradient =
    contrast === "strong"
      ? "linear-gradient(90deg, rgba(43,31,24,0.05) 0%, rgba(43,31,24,0.10) 50%, rgba(43,31,24,0.05) 100%)"
      : "linear-gradient(90deg, rgba(43,31,24,0.04) 0%, rgba(43,31,24,0.08) 50%, rgba(43,31,24,0.04) 100%)";

  return (
    <div
      style={{
        height: `${height}px`,
        width: `${widthPercent}%`,
        background: gradient,
        backgroundSize: "200% 100%",
        animation: `furnishes-shimmer 2s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        marginBottom: `${marginBottomPx}px`,
      }}
    />
  );
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      style={{
        background: "var(--card-soft)",
        border: "1px solid var(--border)",
        padding: "24px",
        minHeight: "120px",
        display: "grid",
        gap: "10px",
        alignContent: "start",
      }}
    >
      <SkeletonBar
        height={16}
        widthPercent={30}
        contrast="strong"
        delay={delay}
      />
      <SkeletonBar
        height={10}
        widthPercent={90}
        contrast="soft"
        delay={delay + 0.05}
      />
      <SkeletonBar
        height={10}
        widthPercent={60}
        contrast="soft"
        delay={delay + 0.1}
      />
    </div>
  );
}
