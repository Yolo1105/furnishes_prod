import type {
  Cart,
  CartItem,
  Address,
  PaymentMethod,
  ContactPrefs,
} from "./types";

export { computeOrderSummary } from "@/lib/commerce/order-summary";
export { formatETARange } from "@/lib/commerce/delivery-options";

export function getMockCart(): Cart {
  return {
    items: [
      {
        id: "ci1",
        productId: "p_aarde_240",
        productName: "Aarde 240 Sofa",
        productCategory: "Sofas",
        subline: "Boucle linen · Oak base",
        unitPriceCents: 298_000,
        currency: "SGD",
        qty: 1,
        coverHue: 30,
        maxQty: 5,
        projectId: "p1",
        projectName: "Tampines Condo — Living Room",
      },
      {
        id: "ci2",
        productId: "p_linen_rug",
        productName: "Undyed Wool Rug 200×300",
        productCategory: "Rugs",
        subline: "Flatweave · Natural",
        unitPriceCents: 124_000,
        currency: "SGD",
        qty: 1,
        coverHue: 45,
        maxQty: 3,
        projectId: "p1",
        projectName: "Tampines Condo — Living Room",
      },
      {
        id: "ci3",
        productId: "p_brass_lamp",
        productName: "Sienna Floor Lamp",
        productCategory: "Lighting",
        subline: "Brushed brass · Linen shade",
        unitPriceCents: 48_000,
        currency: "SGD",
        qty: 2,
        coverHue: 60,
        maxQty: 2,
        stockWarning: "Only 2 left",
      },
    ],
    shippingAddressId: "a1",
  };
}

export function getMockAddresses(): Address[] {
  return [
    {
      id: "a1",
      label: "Home",
      recipientName: "Mohan Tan",
      phone: "+65 9123 4567",
      postalCode: "521123",
      street: "123 Tampines Street 14",
      unit: "#14-07",
      landmark: "Near Tampines West MRT (DT31)",
      isDefault: true,
      hasLiftAccess: true,
    },
    {
      id: "a2",
      label: "Work",
      recipientName: "Mohan Tan",
      phone: "+65 9123 4567",
      postalCode: "068898",
      street: "10 Marina Boulevard",
      unit: "#32-11, Tower 2",
      landmark: "Marina Bay Financial Centre",
      isDefault: false,
      hasLiftAccess: true,
    },
  ];
}

export function getMockPaymentMethods(): PaymentMethod[] {
  return [
    {
      id: "pm1",
      kind: "card",
      last4: "4242",
      brand: "visa",
      expMonth: 11,
      expYear: 2027,
      holderName: "MOHAN TAN",
      isDefault: true,
    },
    {
      id: "pm2",
      kind: "paynow",
      isDefault: false,
    },
  ];
}

export function getMockContactPrefs(): ContactPrefs {
  return {
    marketingEmailOptIn: true,
    marketingSmsOptIn: false,
    deliverySmsOptIn: true,
    transactionalEmailRequired: true,
  };
}

export { formatSGD } from "@/lib/site/money";
