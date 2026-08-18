import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import { RouteHandoff } from "@/components/route-handoff/RouteHandoff";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  axes: ["wdth"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Furnishes",
    template: "%s | Furnishes",
  },
  description:
    "Furnishes is an interior design studio for modern living. Concept, planning, and 3D visualization that turn clear plans into calm, lasting spaces.",
  robots:
    process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1"
      ? { index: true, follow: true }
      : { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${archivo.variable} ${spaceMono.variable}`}>
      <body>
        <RouteHandoff>{children}</RouteHandoff>
      </body>
    </html>
  );
}
