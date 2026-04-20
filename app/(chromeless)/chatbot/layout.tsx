import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { ChatbotShell } from "@/components/eva/chatbot-shell";
import { SITE_TITLE } from "@/content/site/site";

import "./eva-dashboard-theme.css";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `AI Assistant | ${SITE_TITLE}`,
  description:
    "Science-backed interior recommendations with Eva — your interior assistant.",
};

/**
 * Dedicated assistant viewport (no marketing Header/Footer).
 * Shell matches `chatbot_v3` app layout: Manrope, forced light theme, themed Sonner.
 */
export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatbotShell fontClassName={manrope.className}>{children}</ChatbotShell>
  );
}
