import type { Metadata } from "next";
import "@/lib/site/env";
import { Inter, Inter_Tight, Manrope } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { RightNavProvider } from "@/components/site/right-nav-context";
import { RouteProgressSweep } from "@/components/site/route-progress-sweep";
import { CookieConsent } from "@/components/site/cookie-consent";
import { SITE_TITLE } from "@/content/site/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
  weight: ["300", "500"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: "Interior design and space planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${interTight.variable} ${manrope.variable} h-full font-sans antialiased`}
    >
      <body className="flex min-h-full flex-col bg-transparent font-sans">
        <RouteProgressSweep />
        <AuthSessionProvider>
          <RightNavProvider>{children}</RightNavProvider>
        </AuthSessionProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
