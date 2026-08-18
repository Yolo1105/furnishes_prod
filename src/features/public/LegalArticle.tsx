import { routes } from "@/lib/contracts/routes";

export const LEGAL_PAGES = {
  terms: {
    title: "Terms & Conditions",
    body: [
      "These terms govern use of the Furnishes website and account. They are a working draft pending legal review and do not constitute legal advice.",
      "You must be able to form a contract. You are responsible for the accuracy of the information you provide, including shipping details at checkout.",
      "Catalog prices are shown in the currency of the market you shop in. An order is a request to purchase; it becomes a paid transaction only after the payment provider confirms settlement.",
      "We may suspend an account that abuses rate limits, attempts payment fraud, or otherwise harms the service.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "This notice describes personal data Furnishes processes. It is a working draft aligned to the account-deletion implementation and pending PDPA legal review.",
      "We collect account credentials (email, password hash), session tokens, optional profile fields (display name, style, budget), conversation messages, uploads, room plans, inspiration items, project collaboration records, saved addresses, and cart contents.",
      "When you place an order we keep the order and line items, including an anonymised shipping snapshot after account deletion, for Singapore’s five-year transaction-record requirement. CostLog (model, token counts, cost) and SecurityEvent audit rows are also retained.",
      "On account deletion we wipe preferences, conversations, uploads, generations, inspiration, studio pieces, room plans, projects you own, addresses, carts, sessions, and related personal tables. We do not keep a live address book after deletion.",
      "Contact hello@furnishes.sg to access, correct, or delete personal data, or to ask about this notice.",
    ],
  },
  refunds: {
    title: "Refund Policy",
    body: [
      "Refunds currently apply only when the payment provider reports them to us. There is no in-app refund initiation, returns, or RMA flow yet.",
      "Unpaid orders can be cancelled from your account while payment is still outstanding; items return to the cart.",
      "For a paid order, email hello@furnishes.sg with the order number. We will match the provider’s refund event to the order once it arrives.",
      "This policy is a working draft pending legal review required for live Stripe account approval.",
    ],
  },
  contact: {
    title: "Contact",
    body: [
      "Furnishes — a design studio for modern interiors.",
      "Email: hello@furnishes.sg",
      "Hours: Mon–Fri 10:00–18:00 SGT. Closed Sunday and public holidays.",
      "For account, privacy, or order questions, include your account email and (if relevant) order number. Do not send payment card details.",
    ],
  },
} as const;

export function LegalArticle({
  page,
}: {
  page: (typeof LEGAL_PAGES)[keyof typeof LEGAL_PAGES];
}) {
  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem" }}>
      <p>
        <a href={routes.home}>furnishes.</a>
      </p>
      <h1>{page.title}</h1>
      {page.body.map((paragraph) => (
        <p key={paragraph.slice(0, 48)}>{paragraph}</p>
      ))}
    </main>
  );
}
