import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Furnishes",
  description:
    "How Furnishes handles your data under Singapore's PDPA — what we collect, how we use it, and your rights.",
  openGraph: {
    title: "Privacy Policy — Furnishes",
    description:
      "How Furnishes handles your data under Singapore's PDPA — what we collect, how we use it, and your rights.",
    type: "website",
    siteName: "Furnishes",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy — Furnishes",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDF5EC",
        color: "#2B1F18",
        fontFamily: "Manrope, ui-sans-serif, system-ui",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9E7A5E",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={12} />
          Home
        </Link>

        <div
          style={{
            marginTop: 24,
            fontSize: 10.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#9E7A5E",
            fontWeight: 500,
          }}
        >
          <span style={{ color: "#f24a12" }}>[ </span>
          PRIVACY
          <span style={{ color: "#f24a12" }}> ]</span>
        </div>

        <h1
          style={{
            marginTop: 16,
            fontSize: 36,
            lineHeight: 1.1,
            letterSpacing: "-0.015em",
            fontWeight: 600,
          }}
        >
          Privacy Policy
        </h1>
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "#9E7A5E",
            fontWeight: 300,
          }}
        >
          Last updated: 14 April 2026 · PDPA-compliant for Singapore
        </p>

        <div
          style={{
            marginTop: 36,
            display: "grid",
            gap: 28,
            fontSize: 14,
            lineHeight: 1.7,
            fontWeight: 300,
          }}
        >
          <Section title="What we collect">
            When you sign up: your name, email, hashed password. When you use
            Furnishes: your style preferences, budget, conversations with Eva,
            uploaded room photos, addresses you save, payment tokens (never raw
            card numbers — those live with Stripe), and order history.
          </Section>

          <Section title="How we use it">
            To provide the service: personalising Eva's recommendations,
            fulfilling orders, sending receipts and delivery updates. For
            marketing: only if you opt in, via the Contact preferences page.
          </Section>

          <Section title="Who we share with">
            Sub-processors we work with: Stripe (payments), Resend (email),
            Cloudflare R2 (photo storage), Anthropic / OpenAI (Eva's underlying
            model). We have data processing agreements with each. We never sell
            your data.
          </Section>

          <Section title="Your rights under PDPA">
            You can: access your data (via Account → Privacy & Data → Export
            your data), correct inaccuracies (via Profile), withdraw consent for
            marketing (via Contact preferences), and request deletion (7-day
            grace period then permanent).
          </Section>

          <Section title="Data retention">
            We retain your account data while your account is active, and for 30
            days after deletion for backup recovery. Order records are kept for
            7 years for tax compliance, as required by Singapore law.
          </Section>

          <Section title="Security">
            Passwords hashed with bcrypt. TLS in transit. Encrypted at rest.
            Payment data never touches our servers. We've implemented reasonable
            technical measures as required by PDPA section 24.
          </Section>

          <Section title="Cookies">
            We use essential cookies for authentication and session management.
            Analytics cookies are opt-in via the cookie banner. We don't use
            third-party tracking cookies for advertising.
          </Section>

          <Section title="Data Protection Officer">
            For PDPA access, correction, or deletion requests, contact our DPO:{" "}
            <a href="mailto:dpo@furnishes.sg" style={{ color: "#f24a12" }}>
              dpo@furnishes.sg
            </a>
            . We'll respond within 30 days as required by law.
          </Section>

          <Section title="Changes to this policy">
            If we update this policy, we'll email account holders and note the
            change in your Activity log. Material changes require renewed
            consent.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      <div style={{ color: "#2B1F18" }}>{children}</div>
    </section>
  );
}
