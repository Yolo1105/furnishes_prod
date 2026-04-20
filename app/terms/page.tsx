import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — Furnishes",
  description:
    "The terms governing your use of Furnishes — Singapore's AI-powered interior design service.",
  openGraph: {
    title: "Terms of Service — Furnishes",
    description:
      "The terms governing your use of Furnishes — Singapore's AI-powered interior design service.",
    type: "website",
    siteName: "Furnishes",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service — Furnishes",
  },
};

export default function TermsPage() {
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
          LEGAL
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
          Terms of Service
        </h1>
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "#9E7A5E",
            fontWeight: 300,
          }}
        >
          Last updated: 14 April 2026
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
          <Section title="01. About these terms">
            These terms govern your use of Furnishes (furnishes.sg). By creating
            an account, you agree to them. If you don't agree, don't use the
            service.
          </Section>

          <Section title="02. Your account">
            You are responsible for keeping your account credentials
            confidential. Notify us at security@furnishes.sg if you suspect
            unauthorised access. One person per account. Don't share your
            sign-in details.
          </Section>

          <Section title="03. What we provide">
            Furnishes is an AI-assisted interior design service for Singapore
            residents. We help you discover your style, brief Eva about your
            rooms, shortlist pieces, and — when our commerce features launch —
            purchase furniture from curated collections.
          </Section>

          <Section title="04. Eva (AI assistant)">
            Eva provides design suggestions based on your stated preferences and
            uploaded photos. Suggestions are editorial opinions, not
            professional interior design advice. For structural, electrical, or
            load-bearing decisions, consult a licensed professional.
          </Section>

          <Section title="05. Pricing & commerce">
            When commerce launches, prices are shown in Singapore Dollars (SGD)
            inclusive of GST. We reserve the right to correct pricing errors.
            Orders are subject to our refund and returns policy, published
            separately at the time of launch.
          </Section>

          <Section title="06. Intellectual property">
            Your uploaded photos and Style Profile remain yours. You grant us a
            licence to process them for the purpose of delivering the service.
            Our interface, Eva's conversations, and editorial content remain
            ours.
          </Section>

          <Section title="07. Acceptable use">
            Don't use Furnishes to harass others, upload illegal content,
            attempt to compromise our systems, or abuse our fair-use policies on
            AI conversation limits.
          </Section>

          <Section title="08. Termination">
            You can delete your account anytime via Account → Privacy & Data. We
            may suspend accounts that violate these terms. Deletion is permanent
            after a 7-day grace period.
          </Section>

          <Section title="09. Liability">
            Furnishes is provided as-is. We do our best, but cannot guarantee
            uninterrupted service or perfect recommendations. Our liability is
            limited to the amount you've paid us in the prior 12 months.
          </Section>

          <Section title="10. Governing law">
            These terms are governed by the laws of Singapore. Disputes go to
            the courts of Singapore.
          </Section>

          <Section title="11. Contact">
            Questions? Email hello@furnishes.sg. PDPA-specific queries go to{" "}
            <a href="mailto:dpo@furnishes.sg" style={{ color: "#f24a12" }}>
              dpo@furnishes.sg
            </a>
            .
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
