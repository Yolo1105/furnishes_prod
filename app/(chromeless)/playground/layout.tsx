import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Syne } from "next/font/google";
import "./playground.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
  // Avoid Chrome preload warning: Syne applies via CSS variable after R3F mounts.
  preload: false,
});

export const metadata: Metadata = {
  title: "Studio — Furnishes",
  description: "Interior design workspace",
};

export default function PlaygroundLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={`studio-shell ${syne.variable}`}
      style={
        {
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          height: "100dvh",
          width: "100vw",
          fontFamily: "var(--font-syne), system-ui, sans-serif",
        } satisfies CSSProperties
      }
    >
      {children}
    </div>
  );
}
