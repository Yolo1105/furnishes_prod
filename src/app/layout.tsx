import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import { RouteHandoff } from "@/components/route-handoff/RouteHandoff";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { ClerkSessionBridge } from "@/features/auth/ClerkSessionBridge";
import { LandingFreezeBoot } from "@/features/landing/LandingFreezeBoot";
import { resolvedPublicOrigin } from "@/server/app-origin";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteRobots } from "@/lib/seo";
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
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: "%s | Furnishes",
  },
  description: SITE_DESCRIPTION,
  category: "interior design",
  robots: siteRobots(),
  openGraph: {
    type: "website",
    locale: "en_SG",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
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
        <LandingFreezeBoot />
        <SiteJsonLd />
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
