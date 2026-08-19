import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Script from "next/script";
import { Archivo, Space_Mono } from "next/font/google";
import { RouteHandoff } from "@/components/route-handoff/RouteHandoff";
import { ClerkSessionBridge } from "@/features/auth/ClerkSessionBridge";
import { LANDING_FREEZE_BOOT_SCRIPT } from "@/features/landing/landing-freeze";
import { resolvedPublicOrigin } from "@/server/app-origin";
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
  metadataBase: new URL(resolvedPublicOrigin() || "http://localhost:3000"),
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
  const app = <RouteHandoff>{children}</RouteHandoff>;

  return (
    <html lang="en" className={`${archivo.variable} ${spaceMono.variable}`}>
      <body>
        <Script id="landing-freeze-boot" strategy="beforeInteractive">
          {LANDING_FREEZE_BOOT_SCRIPT}
        </Script>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider
            signInUrl="/login"
            signUpUrl="/signup"
            signInFallbackRedirectUrl="/api/auth/clerk-callback"
            signUpFallbackRedirectUrl="/api/auth/clerk-callback"
            afterSignOutUrl="/api/auth/logout"
          >
            <ClerkSessionBridge />
            {app}
          </ClerkProvider>
        ) : (
          app
        )}
      </body>
    </html>
  );
}
