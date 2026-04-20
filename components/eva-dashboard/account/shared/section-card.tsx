import type { ReactNode, CSSProperties } from "react";

/**
 * SectionCard — the universal bordered panel used across account, cart,
 * checkout, support. Every tile/card/panel in this design system uses it.
 *
 * Design rules:
 * - Square corners (no rounded — matches the --radius: 0 rule)
 * - Background resolves to `--card` token; border to `--border`
 * - `tone="muted"` switches the background to the peachy muted tone for
 *   secondary/nested panels
 * - Uses inline styles rather than Tailwind utility classes so it renders
 *   correctly anywhere the CSS vars are defined (including /cart and
 *   /checkout which wrap in .eva-dashboard-root)
 */
export function SectionCard({
  children,
  className = "",
  as: Tag = "div",
  interactive,
  tone = "default",
  padding = "md",
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
  interactive?: boolean;
  tone?: "default" | "muted" | "soft";
  padding?: "none" | "sm" | "md" | "lg";
  style?: CSSProperties;
}) {
  const pad =
    padding === "none"
      ? ""
      : padding === "sm"
        ? "p-4"
        : padding === "lg"
          ? "p-6 md:p-8"
          : "p-5";

  const bgValue =
    tone === "muted"
      ? "var(--accent-soft)"
      : tone === "soft"
        ? "var(--card-soft)"
        : "var(--card)";

  const baseStyle: CSSProperties = {
    background: bgValue,
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    ...style,
  };

  return (
    <Tag
      className={`relative ${pad} ${interactive ? "cursor-pointer" : ""} ${className}`}
      style={baseStyle}
      onMouseEnter={
        interactive
          ? (e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border-strong)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 16px rgba(43,31,24,0.06)";
            }
          : undefined
      }
      onMouseLeave={
        interactive
          ? (e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }
          : undefined
      }
    >
      {children}
    </Tag>
  );
}
