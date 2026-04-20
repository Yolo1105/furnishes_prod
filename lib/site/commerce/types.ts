/**
 * Commerce types — shared by cart, checkout, orders, addresses, payment.
 * Kept separate from /lib/site/account/types.ts to avoid a monolithic file.
 */

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  variantLabel?: string;
  /** e.g. "Boucle linen · Oak base" */
  subline?: string;
  unitPriceCents: number;
  currency: "SGD";
  qty: number;
  coverHue: number;
  /** Stock limit for the qty stepper */
  maxQty?: number;
  stockWarning?: string;
  savedForLater?: boolean;
  /** Optional link back to the project that owned this item */
  projectId?: string | null;
  projectName?: string | null;
};

export type Cart = {
  items: CartItem[];
  /** Shipping address selected, if any */
  shippingAddressId?: string | null;
  /** Gift code applied */
  giftCode?: string | null;
  giftDiscountCents?: number;
};

export type Address = {
  id: string;
  label: "Home" | "Work" | "Other";
  recipientName: string;
  phone: string;
  postalCode: string;
  street: string;
  unit?: string;
  landmark?: string;
  isDefault: boolean;
  hasLiftAccess?: boolean;
};

export type PaymentMethod = {
  id: string;
  kind: "card" | "paynow";
  /** For cards — last 4 and brand */
  last4?: string;
  brand?: "visa" | "mastercard" | "amex";
  expMonth?: number;
  expYear?: number;
  holderName?: string;
  isDefault: boolean;
};

export type DeliveryOption = {
  id: string;
  label: string;
  subtitle: string;
  priceCents: number;
  etaFrom: string; // ISO
  etaTo: string; // ISO
  /** "standard" | "scheduled" | "white-glove" */
  kind: "standard" | "scheduled" | "white-glove";
  /** Applies only to these kinds of items (optional filter hint) */
  appliesTo?: "all" | "large";
};

export type OrderSummary = {
  subtotalCents: number;
  deliveryCents: number;
  discountCents: number;
  totalCents: number;
  currency: "SGD";
};

export type CheckoutStep = "shipping" | "delivery" | "review";

export type ContactPrefs = {
  marketingEmailOptIn: boolean;
  marketingSmsOptIn: boolean;
  deliverySmsOptIn: boolean;
  /** Always true by policy — rendered as locked in UI */
  transactionalEmailRequired: boolean;
};
